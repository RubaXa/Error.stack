(function (){
	var _idx;
	var _stack = [];
	var _cache = {};
	var _version = "0.0.1";


	function setStack(value){
		var stack = [];

		value = _convert(value);
		value.forEach(function (line){
			var err = _getError(line);
			if( err ){
				stack.push(err);
			}
		});

		if( stack.length ){
			ui.classList.add("active");

			titleEl.innerHTML = value[0];
			titleEl.style.marginLeft = -titleEl.offsetWidth/2+'px';

			navEl.innerHTML = stack.map(function (err, i){
				return '<div data-idx="'+i+'">'
				+ err.line +': <span class="fn">'+err.fn.replace(/</g, '&lt;')+'</span><br/>'
				+ '<small>'+err.file+'</small>'
				+ '</div>';
			}).join('');

			_stack = stack;
			seek(0);
		}
	}


	function seek(idx){
		if( _idx != idx ){
			(_idx != null) && navEl.children[_idx].classList.remove('active');
			navEl.children[_idx = idx].classList.add('active');
			_show(idx);
		}
	}


	function _show(idx){
		var err = _stack[idx];
		var callFn = _stack[idx-1] && _stack[idx-1].fn || err.fn;

		_req(err.file, function (code){
			code = code.split(/\n/);

			var
				  pos = err.pos
				, line = err.line-1
				, bugLine = code[line]
				, beautify = beautifyChecked.checked
			;

			if( pos >= 0 ){
				var before = bugLine.substr(0, pos)+'/*!B*/';
				var after = bugLine.substr(pos).replace(/^([_0-9a-z]+\b|.)/i, '$1/*B!*/');
				var x;

				x = before.lastIndexOf('){', Math.max(before.length - 80, 0));
				x = x > 0 ? x+2 : 0;
				before = before.substr(0, x) +'/*!BUG*/'+ before.substr(x);

				x = after.indexOf('},', 50);
				x = x > 0 ? x : after.length;
				after = after.substr(0, x) +'/*BUG!*/'+ after.substr(x);

				bugLine = before + after;
			}
			else {
				bugLine = '/*!BUG*/'+ bugLine +'/*BUG!*/';
			}

			code[line] = bugLine;

			code = code.join('\n');

			if( beautify ){
				code = js_beautify(code, { indent_size: 2, wrap_line_length: 100 });
			}

			code = hljs.highlight('javascript', code).value;

			code = code.replace(/<span class="comment">\/\*!BUG\*\/<\/span>([\r\n\s+]*[\s\S]+)<span class="comment">\/\*BUG!\*\/<\/span>/, function (_, bug){
				if( pos >= 0 ){
					bug = bug.replace(/\s*<span class="comment">\/\*!B\*\/<\/span>([\s\S]+)<span class="comment">\/\*B!\*\/<\/span>\s*/, function (_, bug){
						return '<span class="bug">'+bug.trim()+'</span>';
					});
				}
				bug = bug.replace(new RegExp('(\\b'+callFn.split(/[/.]/).pop()+'\\b)', 'gm'), '<span class="bug-fn">$1</span>');

				if( beautify ){
					bug = bug.trim();
				}

				return	'<span id="bug">'+bug+'</span>';
			});

			console.time('remove');
			codeEl.firstChild && codeEl.removeChild(codeEl.firstChild);
			console.timeEnd('remove');

			console.time('innerHTML');
			var div = document.createElement('div');
			div.innerHTML = code;
			codeEl.appendChild(div);
			console.timeEnd('innerHTML');

			setTimeout(function (){
				var bug = document.getElementById('bug');
				if( bug ){
					var bugggy = bug.querySelector('.bug') || bug.querySelector('.bug-fn') || bug;
					var rect = bugggy.getBoundingClientRect();
					window.scrollTo(
						  0//rect.left + window.pageXOffset - window.innerWidth/2
						, rect.top + window.pageYOffset - window.innerHeight/2 + 50
					);
				}
			}, 10);
		});
	}


	function _req(file, callback){
		if( file in _cache ){
			callback(_cache[file]);
		}
		else {
			var a = document.createElement('a');
			var xhr = new XMLHttpRequest();

			a.href = file;
			xhr.open("GET", a.hostname == location.hostname ? file : 'http://jsonp.jit.su/?url='+decodeURIComponent(file), true);

			xhr.onload = xhr.onerror = function (){
				var code = xhr.responseText;

				try {
					code = JSON.parse(code);
					code = code.success || code.error;
				} catch (er){ }

				callback(_cache[file] = code);
				xhr.onload = xhr.onerror = null;
				xhr = null;
			};

			xhr.send(null);
			a = null;
		}
	}


	function _convert(value){
		value = value.trim().split('\n');

		if( value.length == 3 && /^http/.test(value[1]) ){
			value = [
				value[0],
				'<unknown>@'+value[1]+':'+value[2].substr(5)
			];
		}

		return	value;
	}


	function _getError(value){
		var match = value.match(/at\s+(.*?)\((.*?)\)/), file;

		if( !match ){
			match = value.match(/at\s+(.+)/);
			if( !match ){
				match = value.match(/^(.*?)(?:\/<)*@(.*?)$/);
			} else {
				match[0] = '<anonymous>';
				match.unshift('');
			}
		}

		if( match && !/_errorStackWrapper/.test(match[1]) ){
			file	= match[2].match(/^(.*?):(\d+)(?::(\d+))?/) || [];
			match	= {
				  fn:	(match[1] || '<anonymous>').trim()
				, file:	file[1]
				, line:	file[2]|0
				, pos:	file[3]*1-1
			};
		}
		else {
			match = null;
		}

		return	match;
	}


	// UI
	window.onresize = function (){
		navEl.style.maxHeight = (window.innerHeight - 80) + 'px';
	};
	window.onresize();

	var pid = 0;
	inputEl.oninput = function (delay){
		clearTimeout(pid);

		var pid = setTimeout(function (){
			setStack(inputEl.value);
		}, delay > 0 ? delay : 500);

		inputEl.style.minHeight = '';
		inputEl.style.minHeight = inputEl.scrollHeight + 'px';
	};
	inputEl.oninput(0);

	navEl.onclick = function (evt){
		var el = evt.target;
		seek((el.dataset.idx || el.parentNode.dataset.idx)|0);
	};

	backEl.onclick = function (){
		ui.classList.remove('active');
		_idx = null;
		inputEl.value = '';
		inputEl.oninput();
		inputEl.focus();
	};

	beautifyChecked.onchange = function (){
		_show(_idx);
	};

	demoEl.onclick = function (){
		inputEl.value = Error.stack[0].toString();
		inputEl.oninput(1500);
	};

	console.log('Error.stack: '+_version);
})();
