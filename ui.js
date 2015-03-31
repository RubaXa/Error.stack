(function () {
	var _idx;
	var _stack = [];
	var _cache = {};
	var _version = "0.2.0";
	var _errLog = {}, _errLogId;

	/** @namespace ui */
	/** @namespace navEl */
	/** @namespace codeEl */
	/** @namespace titleEl */
	/** @namespace proxyEl */
	/** @namespace loadingEl */


	// Получаем URL прокси
	proxyEl.onblur = function () {
		localStorage.setItem('proxy', proxyEl.value);
	};

	proxyEl.value = localStorage.getItem('proxy') || 'http://jsonp.jit.su/?url=';


	function setStack(err) {
		var stack = [];

		if (/^\[.+]$/.test(err)) {
			JSON.parse(err).forEach(function (entry) {
				entry.label += (entry.args ? ': ' + JSON.stringify(entry.args) : '');
				stack.push(entry);
			});
		}
		else {
			err = _parse(err);
			err.forEach(function (line) {
				var err = _getError(line);

				if (err) {
					stack.push({
						label: err.fn,
						meta: err
					});
				}
			});
		}

		if (stack.length) {
			ui.classList.add("active");

			setTitle(stack[0].label || err[0]);

			navEl.innerHTML = stack.map(function (entry, i) {
				return '<div data-idx="' + i + '">'
					+ entry.meta.line + ': <span class="fn">' + entry.label.replace(/</g, '&lt;') + '</span><br/>'
					+ '<small>' + entry.meta.file + '</small>'
					+ '</div>';
			}).join('');

			// reset
			_idx = -1;
			_stack = stack;
			seek(0);
		}
	}


	function setTitle(title) {
		titleEl.textContent = title;
		titleEl.style.marginLeft = -titleEl.offsetWidth / 2 + 'px';
	}


	function seek(idx) {
		if (_idx != idx) {
			loadingEl.style.display = '';

			(_idx >= 0) && navEl.children[_idx].classList.remove('active');
			navEl.children[_idx = idx].classList.add('active');

			setTimeout(function () {
				_show(idx);
			}, 10);
		}
	}


	function _show(idx) {
		var entry = _stack[idx];
		var meta = entry.meta;
		var callFn = (_stack[idx - 1] && _stack[idx - 1].fn || '' || meta.fn).split(/[/.]/).pop();
		var inFn = meta.fn.split(/[/.]/).pop();

		_req(meta.file, function (code) {
			code = code.split(/\n/);

			var pos = meta.pos,
				line = meta.line - 1,
				bugLine = code[line],
				beautify = beautifyChecked.checked;

			if (pos >= 0) {
				var before = bugLine.substr(0, pos) + '/*!B*/';
				var after = bugLine.substr(pos).replace(/^([_0-9a-z]+\b|.)/i, '$1/*B!*/');
				var x;

				x = before.lastIndexOf('){', Math.max(before.length - 80, 0));
				x = x > 0 ? x + 2 : 0;
				before = before.substr(0, x) + '/*!BUG*/' + before.substr(x);

				x = after.indexOf('},', 50);
				x = x > 0 ? x : after.length;
				after = after.substr(0, x) + '/*BUG!*/' + after.substr(x);

				bugLine = before + after;
			}
			else {
				var commentIdx = bugLine.search(/\/[*/]/);
				if (commentIdx > -1) {
					bugLine = '/*!BUG*/' + bugLine.substr(0, commentIdx) + '/*BUG!*/' + bugLine.substr(commentIdx);
				} else {
					bugLine = '/*!BUG*/' + bugLine + '/*BUG!*/';
				}
			}

			if (entry.label) {
				setTitle(entry.label);
			}

			code[line] = bugLine;
			code = code.join('\n');

			if (beautify) {
				code = js_beautify(code, {indent_size: 2, wrap_line_length: 100});
			}

			code = hljs.highlight('javascript', code).value;
			code = code.replace(/<span class="comment">\/\*!BUG\*\/<\/span>([\r\n\s+]*[\s\S]+)<span class="comment">\/\*BUG!\*\/<\/span>/, function (_, bug) {
				if (pos >= 0) {
					bug = bug.replace(/\s*<span class="comment">\/\*!B\*\/<\/span>([\s\S]+)<span class="comment">\/\*B!\*\/<\/span>\s*/, function (_, bug) {
						return '<span class="bug">' + bug.trim() + '</span>';
					});
				}

				if (inFn) {
					bug = bug.replace(new RegExp('(\\b' + inFn + ':)', 'gm'), '<span class="bug-fn-in">$1</span>');
				}

				if (callFn) {
					bug = bug.replace(new RegExp('(\\b' + callFn + '\\b)', 'gm'), '<span class="bug-fn">$1</span>');
				}

				if (beautify) {
					bug = bug.trim();
				}

				return '<span id="bug"></span>' + bug + '<span id="bugEnd"></span>';
			});

			console.time('remove');
			codeEl.firstChild && codeEl.removeChild(codeEl.firstChild);
			console.timeEnd('remove');

			console.time('innerHTML');
			var div = document.createElement('div');
			div.innerHTML = code;
			codeEl.appendChild(div);
			console.timeEnd('innerHTML');

			setTimeout(function () {
				var bug = document.getElementById('bug');

				if (bug) {
					var rect = bug.getBoundingClientRect();
					var bugggy = document.querySelector('.bug');

					bug.style.top = rect.top + window.pageYOffset + 'px';
					bug.style.left = '0px';
					bug.style.width = '100%';
					bug.style.height = (bugEnd.getBoundingClientRect().bottom - rect.top) + 'px';
					bug.style.display = 'block';
					bug.style.position = 'absolute';


					if (!bugggy) {
						[].slice.call(document.querySelectorAll('.bug-fn-in ~ .bug-fn')).forEach(function (el) {
							var ind, indent = 0, _ind, value, state = 0, _el = el;
							while (el = el.previousSibling) {
								value = el.nodeValue;

								if (state && /bug-fn-in/.test(el.className)) {
									bugggy = _el;
									bugggy.className = 'bug';
									break;
								}

								if (el.nodeType == 3 && /\n/.test(value)) {
									ind = value.replace(/[^\s]|\n/g, '').length;
									if (ind % 2) {
										continue;
									}

									if (state === 0) {
										state = 1;
										indent = ind;
									}
									else if (_ind < ind) {
//										console.log(_ind, ind, el.previousSibling.innerHTML, el.nextSibling.innerHTML);
										break;
									}

									_ind = ind;
								}
							}
						});

						bugggy = bugggy || document.querySelector('.bug-fn') || document.querySelector('.bug-fn-in') || bug;
					}

					var rect = bugggy.getBoundingClientRect();

					window.scrollTo(
						0//rect.left + window.pageXOffset - window.innerWidth/2
						, rect.top + window.pageYOffset - window.innerHeight / 2 + 50
					);
				}

				loadingEl.style.display = 'none';
			}, 10);
		});
	}


	function _req(file, callback) {
		if (file in _cache) {
			callback(_cache[file]);
		}
		else {
			var a = document.createElement('a');
			var xhr = new XMLHttpRequest();

			a.href = file;
			xhr.open("GET", a.hostname == location.hostname ? file : proxyEl.value + decodeURIComponent(file), true);

			xhr.onload = xhr.onerror = function () {
				var code = xhr.responseText;

				try {
					if (code.charAt(0) == '{') {
						code = JSON.parse(code);
						code = code.success || code.error;
					}
				} catch (er) {
				}

				callback(_cache[file] = code);
				xhr.onload = xhr.onerror = null;
				xhr = null;
			};

			xhr.send(null);
			a = null;
		}
	}


	function _parse(err) {
		if (err instanceof Error) {
			err = err.message + '\n' + err.stack;
		}

		err = err.trim().split('\n');

		if (err.length == 2 && /^\d+:\s+http/.test(err[0])) {
			var tmp = err[0].split(/:\s+/);
			err = [
				err[1],
				'<unknown>@' + tmp[1] + ':' + tmp[0]
			];
		}
		else if (err.length == 3 && /^http/.test(err[1])) {
			err = [
				err[0],
				'<unknown>@' + err[1] + ':' + err[2].substr(5)
			];
		}

		return err;
	}


	function _getError(value) {
		var match = value.match(/at\s+([^\s]+)(?:.*?)\(((?:http|\/)[^)]+:\d+)\)/),
			file;

		if (!match) {
				match = value.match(/at\s+(.+)/);

				if (!match) {
					match = value.match(/^(.*?)(?:\/<)*@(.*?)$/) || value.match(/^()(https?:\/\/.+)/);
				} else {
					match[0] = '<anonymous>';
					match.unshift('');
				}
			}

		if (match && !/_errorStackWrapper/.test(match[1])) {
			file = match[2].match(/^(.*?):(\d+)(?::(\d+))?/) || [];
			match = {
				fn: (match[1] || '<anonymous>').trim(),
				file: file[1],
				line: file[2]|0,
				column: file[3]|0
			};
		}
		else {
			match = null;
		}

		return match;
	}


	function _parseLogFile(file) {
		console.log('_parseLogFile:', file);
		_errLog = {};

		FileAPI.readAsText(file, function (evt) {
			if (evt.type == 'load') {
				evt.result.split(/[\r\n]+/).forEach(function (line, idx) {
					var query = {};

					line.split('&').forEach(function (param) {
						param = param.split('=');
						query[param[0]] = decodeURIComponent(param[1]);
					});

					var prefix = (query.fn || query.method);
					var err = Error.parse(
						(prefix ? prefix + ': ' : '') + (query.err || query.error || query.msg || query.message), query.file || query.filename || query.fileName, query.line || query.lineNo || query.lineno || query.lineNumber, query.stack || query.stacktrace
					);

					if (!_errLog[err._id]) {
						_errLog[err._id] = err;
					} else {
						_errLog[err._id].amount++;
					}
				});

				_redrawErrLog();
			}
		});
	}


	function _redrawErrLog() {
		var errors = [], _id;
		for (_id in _errLog) {
			errors.push(_errLog[_id]);
		}

		errors.sort(function (a, b) {
			return b.amount - a.amount;
		});

		titleEl.style.display = 'none';
		errLogEl.style.display = '';

		errLogEl.innerHTML = errors.map(function (err) {
			return '<li data-id="' + err._id + '" class="' +
			(err.fileName && err.lineNumber ? '' : 'disabled')
			+ '">(' + err.amount + ') ' + err.message + '</li>';
		}).join('');

		// Set log id
		var el = errLogEl.querySelector(':not(.disabled)');

		el.classList.add('selected');

		// Show error
		setStack(_errLog[el.dataset.id]);
	}

	errLogEl.addEventListener('click', function (evt) {
		var el = evt.target;

		if (!el.classList.contains('disabled') && !el.classList.contains('selected')) {
			errLogEl.querySelector('.selected').classList.remove('selected');
			el.classList.add('selected');
			setStack(_errLog[el.dataset.id]);
		}
	}, false);


	//
	//        ~~~ UI ~~~
	//
	window.onresize = function () {
		navEl.style.maxHeight = (window.innerHeight - 80) + 'px';
	};
	window.onresize();

	// Input
	var pid = 0;
	inputEl.oninput = function (delay) {
		var value = inputEl.value.trim();
		clearTimeout(pid);

		var pid = setTimeout(function () {
			titleEl.style.display = '';
			errLogEl.style.display = 'none';

			setStack(value);
		}, delay > 0 ? delay : 500);

		inputEl.style.minHeight = '';
		inputEl.style.minHeight = value ? inputEl.scrollHeight + 'px' : '';
	};
	inputEl.value = '';
	inputEl.oninput(0);

	// Nav
	navEl.onclick = function (evt) {
		var el = evt.target;
		seek((el.dataset.idx || el.parentNode.dataset.idx) | 0);
	};

	// Beautify
	beautifyChecked.onchange = function () {
		_show(_idx);
	};

	// Demo
	demoEl.onclick = function () {
		inputEl.value = Error.stack[0].toString();
		inputEl.oninput(1500);
	};

	// Drag'n'Drop
	FileAPI.event.dnd(document, function (state) {
		baseUI.style.display = state ? 'none' : '';
		dndOverlay.style.display = state ? '' : 'none';
	}, function (files) {
		loadingEl.style.display = '';

		files.forEach(function (file) {
			if (/\.(txt|log)/.test(file.name)) {
				_parseLogFile(file);
			}
		});
	});

	// Console
	console.log('Error.stack: ' + _version);
})();
