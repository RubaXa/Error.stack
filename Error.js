/**
 * Error.js
 * @author	RubaXa	<trash@rubaxa.org>
 */

(function (window, Error){
	'use strict';

	var
		  stack = Error.stack = []

		, _index = {}
		, _listener = []
	;


	function _getId(error/**Error*/){
		var
			  msg = (error.stack || error.message).replace(/[a-z]{2,}\d{5,}/g, '')
			, key = error.fileName+':'+error.lineNumber+':'+(error.lineColumn || msg)
			, i = key.length
			, id = 0
		;

		while( i-- ){
			id += key.charCodeAt(i);
		}

		return id.toString(36);
	}


	function _normalize(error/**Error*/, fileName, lineNumber){
		var match = (error.stack || '').match(/(http.*?):(\d+)?(?::(\d+))?[\r\n]/); // first match
		if( match ){
			error.fileName		= error.fileName || fileName || match[1];
			error.lineNumber	= (error.lineNumber || lineNumber || match[2])|0;
			error.lineColumn	= (error.lineColumn || match[3])|0;
		}
	}


	function _toJSON(){
		var err = this;
		return {
			  _id:		err._id
			, name:		err.name
			, message:	err.message
			, stack:	err.stack
			, fileName:		err.fileName
			, lineNumber:	err.lineNumber
			, lineColumn:	err.lineColumn
		};
	}


	function _toString(){
		return	this.message+'\n'+this.stack;
	}


	/**
	 * Add error
	 * @param  {Error|String} message
	 * @param  {String} [fileName]
	 * @param  {Number} [lineNumber]
	 * @param  {String} [stacktrace]
	 * @return {Error}
	 */
	Error.parse = function (message, fileName, lineNumber, stacktrace){
		var error = (message instanceof Error) ? message : new Error(message.message || message);

		error.stack		= message.stack || stacktrace || (error.message.split(' ')[1]+'@'+fileName+':'+lineNumber);
		error.amount	= 1;
		error.toJSON	= _toJSON;
		error.toString		= _toString;
		error.fileName		= fileName;
		error.lineNumber	= lineNumber;
		error._id			= _getId(error);

		_normalize(error, fileName, lineNumber);

		return	error;
	};


	/**
	 * Add error
	 * @param {Error|String} message
	 * @param {String} [fileName]
	 * @param {Number} [lineNumber]
	 * @param {String} [stacktrace]
	 */
	Error.add = function (message, fileName, lineNumber, stacktrace){
		if( message ){
			var
				  err	= Error.parse(message, fileName, lineNumber, stacktrace)
				, key	= err._id
				, idx	= _index[key]
				, i = _listener.length
			;

			if( idx >= 0 ){
				err = stack[idx];
				err.amount++;
			} else {
				_index[key] = stack.push(err) - 1;
			}

			while( i-- ){
				_listener[i](err);
			}
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
})(window, window.Error);
