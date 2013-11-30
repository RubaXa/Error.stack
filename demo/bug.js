/* Simple bug */

jQuery(function ($){
	$(window).on('bug', function (){
		try {
			bug();
		} catch (err){
			window.demoBugStack = err.toString()+'\n'+err.stack;
		}
	});

	$(window).trigger('bug');
});
