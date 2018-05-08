module.exports = d => {
	let Promise = d.Promise;
	/**
	 * Creates an intermediate layer to convert options from individual
	 * requests into arrays of options for bulk processing. createHandler
	 * options are as follows:
	 * 
	 * - handler: The bulk handler function. Will be provided two arguments,
	 *     a HandlerRequestCollection object to iterate over, and the
	 *     original options provided to createHandler.
	 * - interval: A timeout value in milliseconds, used to ensure that requests
	 *     are handled in a timely manner. Defaults to 100 ms.
	 * - maxSize: An integer maximum batch size that prevents individual batches
	 *     from growing too large. Defaults to 200.
	 * - concurrent: Whether or not to allow batches to run concurrently,
	 *     in the event that a second batch becomes ready before the first
	 *     batch has completed. Defaults to falsey, meaning they will always
	 *     run sequentially.
	 * - skips: Defines the number of times rotation can be skipped if an earlier
	 *     rotation is still running. This applies only to rotation triggered by
	 *     the timed interval; reaching maxSize will always trigger a rotation.
	 *     Defaults to 0 for concurrent runs, and 2 for sequential.
	 * - context: A prototype for the function contexts provided to
	 *     HandlerRequestCollection during processing of a batch. Defaults to an
	 *     empty object.
	 * 
	 * Returns a singleHandler function which queues options for bulk processing.
	 */
	function createHandler(options) {
		// Init Options
		options || (options = {});
		let bulkHandler = undefined,
		    timeout     = 100,
		    maxSize     = 200,
		    concurrent  = false,
		    skips       = undefined,
		    context     = {};
		refreshOptions(options);
		if (!bulkHandler) throw new d.errors.SystemError('A "handler" function must be provided to createHandler options.');

		// Init Status Variables
		let requests           = new HandlerRequestCollection(Object.create(context));
		let lastPromise        = Promise.resolve();
		let skipsSinceRotation = 0;
		let nextTimeout        = null;

		/**
		 * Queues a single handler options object for bulk processing,
		 * and returns a promise that will resolve/reject on completion.
		 */
		function singleHandler(singleOptions) {
			if (requests.size >= maxSize) rotateCollection();
			return requests.add(singleOptions);
		}

		function refreshOptions(options) {
			// Load
			bulkHandler = options.handler    === undefined ? bulkHandler          : options.handler;
			timeout     = options.timeout    === undefined ? timeout              : options.timeout;
			maxSize     = options.maxSize    === undefined ? maxSize              : options.maxSize;
			concurrent  = options.concurrent === undefined ? concurrent           : options.concurrent;
			skips       = options.skips      === undefined ? (concurrent ? 0 : 2) : options.skips;
			context     = options.context    === undefined ? context              : options.context;

			// Validate
			timeout < 1 && (timeout = 1);
			maxSize < 1 && (maxSize = 1);
		}

		/**
		 * If the current collection contains elements, swaps it for
		 * a new one, and processes the records.
		 */
		function rotateCollection() {
			// Init
			let oldRequests;
			skipsSinceRotation = 0;

			// Handle Empty Collection
			if (requests.size == 0) {
				return;
			}

			// Swap && Process Collection
			oldRequests = requests;
			requests    = new HandlerRequestCollection(Object.create(context));
			lastPromise = Promise.resolve(concurrent ? undefined : lastPromise)
				.then(async () => {
					try {
						await bulkHandler(oldRequests, options);
						oldRequests.resolveAll(options => { throw new d.errors.SystemError('This request was not resolved by the handler; all requests must be fulfilled or rejected before the handler completes.'); });
					}
					catch(e) {
						oldRequests.resolveAll(options => { throw e; });
					}
					return Promise.all(oldRequests.promises);
				})
				.catchReturn()
				.then(clearLastPromise);
		}

		function setAutoRotator() {
			nextTimeout = setTimeout(autoRotate, timeout);
		}

		function autoRotate() {
			// Init
			refreshOptions(options);

			// Check If Rotator Should Run
			if (requests.size > 0) {
				// Handle None Running
				if (!lastPromise) {
					rotateCollection();
				}

				// Check If Skip Available
				else {
					if (skipsSinceRotation < skips) {
						skipsSinceRotation++;
					}
					else {
						rotateCollection();
					}
				}
			}

			// Set Next Rotation
			setAutoRotator();
		}

		function clearLastPromise() {
			lastPromise = undefined;
		}

		// Finalize
		setAutoRotator();
		return singleHandler;
	}



	// Class: HandlerRequestCollection

	/**
	 * Class to manage the bulkification of requests.
	 */
	class HandlerRequestCollection {
		/**
		 * Constructs the request collection
		 */
		constructor(context) {
			this.size      = 0;
			this.elements  = [];
			this.promises  = [];
			this.context   = context;
			this.operation = Promise.resolve();
		}

		/**
		 * Adds the provided options given to the singleHandler to the HandlerRequestCollection.
		 * Returns a promise that will resolve/reject once the bulkHandler has completed
		 * processing over the collection.
		 */
		add(singleOptions) {
			let element = {
				_resolve    : null,
				_reject     : null,
				_isComplete : false,
				_isResolved : false,
				_isRejected : false,
				options     : singleOptions,
				resolve     : null,
				reject      : null,
				promise     : null
			};

			element.resolve = doResolve.bind(element);
			element.reject  = doReject.bind(element);
			element.promise = new Promise((resolve, reject) => {
				element._resolve = resolve;
				element._reject  = reject;
			});

			// Finalize
			this._doAdd(element);
			return element.promise;
		}

		/**
		 * Helper function that adds the provided element to the collection.
		 */
		_doAdd(element) {
			this.elements.push(element);
			this.promises.push(element.promise);
			this.size++;
		}

		/**
		 * Iterates over the elements, and calls the provided handler method
		 * with the following four arguments:
		 * 
		 * - options: the individual options object stored in the collection.
		 * - resolve: the method that will resolve the handler's return value
		 *     for this element.
		 * - reject: a method which will reject the handler's processing of
		 *     this element with an Error.
		 * - index: the integer index of the option in the collection.
		 * 
		 * If an error is thrown within the provided handler method, the element's
		 * promise will be rejected automatically. If a promise is returned,
		 * iteration will be halted until it resolves or rejects. If it rejects,
		 * the element's promise will be rejected with the same reason. If it
		 * fulfills, the fulfillment value will be ignored. Only a fulfillment
		 * value given to the resolve method will fulfill the element.
		 * 
		 * If any elements remain unfulfilled/rejected, they will be added to the
		 * new HandlerRequestCollection instance fulfilled in the returned promise.
		 */
		handleEach(handler) {
			let that = this;
			return that.operation = that.operation.then(async function() {
				// Init
				let context   = that.context;
				let remaining = new HandlerRequestCollection(context);
				let elements  = that.elements;

				for (let i = 0; i < elements.length; i++) {
					// Init
					let element = elements[i];

					// Handle
					try {
						await handler.call(context, element.options, element.resolve, element.reject, i);
					}
					catch (e) {
						element.reject(e);
					}

					// Check If Remaining
					if (!element._isComplete) remaining._doAdd(element);
				}

				// Finalize
				return remaining;
			});
		}

		/**
		 * Similar to handleEach, except that elements are processed in parallel.
		 * This provides greater efficiency, and should be preferred when order
		 * of execution is not important.
		 */
		handleAll(handler) {
			let that = this;
			return that.operation = that.operation.then(() => {
				// Init
				let context   = that.context;
				let remaining = new HandlerRequestCollection(context);
				let elements  = that.elements;
				let promises  = new Array(elements.length);

				// Prepare Promises
				for (let i = 0; i < elements.length; i++) {
					// Init
					let element = elements[i];

					// Handle
					try {
						let result = handler.call(context, element.options, element.resolve, element.reject, i);
						promises[i] = Promise.resolve(result).reflect();
					}
					catch (e) {
						promises[i] = Promise.reject(e).reflect();
					}
				}

				// Inspect Promise Results
				return Promise.all(promises).then(results => {
					for (let j = 0; j < results.length; j++) {
						// Init
						let result  = results[j];
						let element = elements[j];

						// Check If Error
						if (!element._isComplete && result.isRejected()) {
							element.reject(result.reason());
						}

						// Check If Remaining
						if (!element._isComplete) remaining._doAdd(element);
					}
					return remaining;
				});
			});
		}
		
		/**
		 * Similar to handleEach and handleAll, except the handler is passed
		 * three arrays of element data rather than individual element data
		 * points (options, resolve, reject -- index is not needed).
		 */
		handleBulk(handler) {
			let that = this;
			return that.operation = that.operation.then(() => {
				// Init
				let context   = that.context;
				let remaining = new HandlerRequestCollection(context);
				let elements  = that.elements;
				let optArray  = handler.length > 0 ? [] : undefined;
				let resArray  = handler.length > 1 ? [] : undefined;
				let rejArray  = handler.length > 2 ? [] : undefined;

				// Build Arrays
				if (handler.length > 0) for (let i = 0; i < elements.length; i++) {
					let element = elements[i]
					optArray && optArray.push(element.options);
					resArray && resArray.push(element.resolve);
					rejArray && rejArray.push(element.reject);
				}

				// Handle
				return Promise.try(async () => {
					await handler.call(context, optArray, resArray, rejArray);
					for (let i = 0; i < elements.length; i++) {
						let element = elements[i];
						if (!element._isComplete) remaining._doAdd(element);
					}
					return remaining;
				});
			});
		}

		/**
		 * Fulfills all elements in the collection with the return value of
		 * the provided handler, and returns a promise which fulfilles to an
		 * empty HandlerRequestCollection. If handler is undefined, fulfills
		 * elements with undefined. If defined, it will have the same signature
		 * as handleAll. If the handler throws, or returns a rejected promise,
		 * the element will be rejected.
		 */
		resolveAll(handler) {
			let that = this;
			return that.operation = that.operation.then(() => {
				// Init
				let context   = that.context;
				let remaining = new HandlerRequestCollection(context);
				let elements  = that.elements;
				let promises  = new Array(elements.length);

				// Prepare Promises
				for (let i = 0; i < elements.length; i++) {
					// Init
					let element = elements[i];

					// Handle
					try {
						let result = !handler ? undefined : handler.call(context, element.options, element.resolve, element.reject, i);
						promises[i] = Promise.resolve(result).reflect();
					}
					catch (e) {
						promises[i] = Promise.reject(e).reflect();
					}
				}

				// Inspect Promise Results
				return Promise.all(promises).then(results => {
					for (let j = 0; j < results.length; j++) {
						// Init
						let result  = results[j];
						let element = elements[j];

						// Reject / Fulfill
						if (!element._isComplete && result.isRejected()) {
							element.reject(result.reason());
						}
						else if (!element._isComplete && result.isFulfilled()) {
							element.resolve(result.value());
						}
					}
					return remaining;
				});
			})
			.catch(e => {
				console.log('in here'); //-------------------
				let elements = that.elements;
				for (let k = 0; k < elements.length; k++) {
					// Init
					let element = elements[k];

					// Reject / Fulfill
					if (!element._isComplete) {
						element.reject(e);
					}
				}
			});
		}
	}



	// Helper Functions

	function doResolve(value) {
		if (this._isComplete) return;
		this._isComplete = true;
		this._isResolved = true;
		this._resolve(value);
	}

	function doReject(value) {
		if (this._isComplete) return;
		this._isComplete = true;
		this._isRejected = true;
		this._reject(value);
	}



	// Finalize
	return createHandler;
}