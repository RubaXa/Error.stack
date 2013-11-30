/**
 * Error.js
 * @author	RubaXa	<trash@rubaxa.org>
 */

(function (window, Error){
	'use strict';

	var
		  stack = []
		, _index = {}
	;


	function _getKey(error/**Error*/){
		var msg = error.message.replace(/[a-z]{2,}\d{5,}/, '');
		return error.fileName+'|'+error.lineNumber+'|'+(error.lineChar || msg);
	}


	function _normalize(error/**Error*/, fileName, lineNumber){
		var match = (error.stack || '').match(/\s(.*?):(\d+)?(?::(\d+))?[\r\n]/); // first match
		if( match ){
			error.fileName = error.fileName || fileName || match[1];
			error.lineNumber = error.lineNumber || lineNumber || match[2];
			error.lineOffset = match[3];
		}
	}


	function _toString(){
		return	this.message+'\n'+this.stack;
	}



	/**
	 * Add error
	 * @param {Error|String} message
	 * @param {String} [fileName]
	 * @param {Number} [lineNumber]
	 * @param {String} [stacktrace]
	 */
	Error.add = function (message, fileName, lineNumber, stacktrace){
		if( message ){
			var error = (message instanceof Error) ? message : new Error(message);

			var
				  key = _getKey(error)
				, idx = _index[key]
			;

			if( idx >= 0 ){
				stacktrace[idx].amount++;
			} else {
				_normalize(error, fileName, lineNumber);

				error.stack		= message.stack || stacktrace || (error.message.split(' ')[1]+'@'+fileName+':'+lineNumber);
				error.amount	= 1;
				error.toString	= _toString;

				_index[key] = stack.push(error) - 1;
			}
		}
	};


	/**
	 * Watch errors
	 * @param {*} target
	 */
	Error.watch = function (target){
		if( target ){
			if( 'onerror' in target ){
				var _onError = target.onerror || function (){};
				target.onerror = function (message, fileName, lineNumber, lineOffset, error){
					Error.add(message, fileName, lineNumber, error && error.stack);
					_onError.apply(this, arguments);

					return	true;
				};
			}
		}
	};


	/**
	 * Wrap function
	 * @param {*} ctx
	 * @param {Function|String} [fn]
	 */
	Error.wrap = function (ctx, fn){
		if( fn ){
			fn = ctx[fn] || fn;
		}
		else {
			fn = ctx;
			ctx = window;
		}

		return	function _errorStackWrapper(){
			var ret;

			try {
				ret = fn.apply(ctx, arguments);
			} catch (err){
//				err.args = arguments;
				Error.add(err);
			}

			return	ret;
		};
	};


	// @export
	Error.stack = stack;
})(window, window.Error);
