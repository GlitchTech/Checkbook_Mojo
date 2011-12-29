//set default timeout
Ajax.Base.addMethods( {
	timeout: 15
});

/**
 * Ajax.Request.abort
 * extend the prototype.js Ajax.Request object so that it supports an abort method
 */
Ajax.Request.addMethods( {

	abort: function() {

		window.clearTimeout( this.timeoutId );
		//prevent and state change callbacks from being issued
		this.transport.onreadystatechange = Prototype.emptyFunction;
		//abort the XHR
		this.transport.abort();
		//update the request counter
		Ajax.activeRequestCount--;

		if( Ajax.activeRequestCount < 0 ) {

			Ajax.activeRequestCount = 0;
		}
	}
});

/**
 * Register global responders that will occur on all AJAX requests
 */
Ajax.Responders.register( {

	onCreate: function( request ) {

		if( Object.isUndefined( request.options.timeout ) ) {

			request.options.timeout = request.timeout;
		}

		var timeoutHandler = function() {
			//If we have hit the timeout and the AJAX request is active, abort it

			switch ( request.transport.readyState ) {
				case 1:
					//see case 3
				case 2:
					//see case 3
				case 3:
					//abort request, return error
					request.abort();

					if( request.options.onFailure ) {

						request.options.onFailure( request.transport, "timeout" );
					}
					break;
				//Case 4 and 0
				default:
					break;
			}
		};

		request.timeoutId = timeoutHandler.delay( request.options.timeout );
	},
	onComplete: function( request ) {
		//Clear the timeout, the request completed ok

		window.clearTimeout( request.timeoutId );
	}
});