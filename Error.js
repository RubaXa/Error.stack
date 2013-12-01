/**
 * Error.js
 * @author	RubaXa	<trash@rubaxa.org>
 */

(function (window, Error){
	'use strict';

	var
		  stack = []
		, _index = {}
		, _listener = []
	;


	function _getKey(error/**Error*/){
		var
			  msg = error.message.replace(/[a-z]{2,}\d{5,}/, '')
			, key = error.fileName+':'+error.lineNumber+':'+(error.lineColumn || msg)
			, i = key.length, num = 0
		;

		while( i-- ){
			num += key.charCodeAt(i);
		}

		return num.toString(32);
	}


	function _normalize(error/**Error*/, fileName, lineNumber){
		var match = (error.stack || '').match(/(http.*?):(\d+)?(?::(\d+))?[\r\n]/); // first match
		if( match ){
			error.fileName = error.fileName || fileName || match[1];
			error.lineNumber = error.lineNumber || lineNumber || match[2];
			error.lineColumn = match[3]|0;
		}
	}


	function _toJSON(){
		var err = this;
		return {
			_id: err._id,
			name: err.name,
			message: err.message,
			stack: err.stack,
			fileName: err.fileName,
			lineNumber: err.lineNumber,
			lineColumn: err.lineColumn
		};
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

			error.stack		= message.stack || stacktrace || (error.message.split(' ')[1]+'@'+fileName+':'+lineNumber);
			error.amount	= 0;
			error.toJSON	= _toJSON;
			error.toString	= _toString;

			_normalize(error, fileName, lineNumber);

			var
				  key	= _getKey(error)
				, idx	= _index[key]
				, i = _listener.length
			;

			if( idx >= 0 ){
				error = stack[idx];
			} else {
				error._id = key;
				_index[key] = stack.push(error) - 1;
			}

			error.amount++;

			while( i-- ){
				_listener[i](error);
			}

			return	error;
		}
	};




	/**
	 * Watch errors
	 * @param {*} target
	 * @param {Function} [fn]
	 */
	Error.watch = function (target, fn){
		Error.on(fn);

		if( target && ('onerror' in target) ){
			var _onError = target.onerror || function (){};

			target.onerror = function (message, fileName, lineNumber, lineColumn, err){
				Error.add(message, fileName, lineNumber, err && err.stack);
				_onError.apply(this, arguments);

				return	true;
			};
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

	/**
	 * Add error listener
	 * @param {Function} fn
	 */
	Error.on = function (fn){
		_listener.push(fn);
	};


	// @export
	Error.stack = stack;
})(window, window.Error);
