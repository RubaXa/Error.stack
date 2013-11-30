/* Simple bug */

jQuery(function ($){
	$(window).on('bug', function (){
		try {
			bug();
		} catch (er){
			console.log(er.stack);
		}
	});

	$(window).trigger('bug');
});
