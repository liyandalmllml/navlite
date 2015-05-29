define(['zepto.js'], function ($) {
	var options = {
		attr: 'smooth-navigate',
		onForward: function () {
			console.log('onForward');
		},

		onBack: function () {
			console.log('onBack');
		},
		
		onForwardRender: function () {
			console.log('onForwardRender');
		},
		
		onBackRender: function () {
			console.log('onBackRender');
		}
	};

	function updateContent ($html, $container, $newContainer, cb) {
		$container.empty().append($html.find('#' + $container.attr('id')).children());
		var attrs = $html.find('body')[0].attributes;
		for (var i = 0; i < attrs.length; i++) {
			$('body').attr(attrs[i].name, attrs[i].value);
		}	
		$newContainer.remove();
		cb = cb || function () {};
		cb();
	}

	function htmlDoc (html) {
		var $html = $('<html></html>');

		function process (tag) {
			var result = html.match('<' + tag + '(\\s+[^>]*)?>[\\w\\W]*(?:<\/' + tag + '>)');
			if (result) {
				var obj = {};
				 $.each($('<div' + result[1] + '/>')[0].attributes, function(i, attr) {
                    obj[attr.name] = attr.value;
                });
				var $tag= $('<' + tag + '></' + tag + '>').append(result[0]).attr(obj);
				$html.append($tag);
			}
		}
		process('head');
		process('body');
		return $html;
	}

	function createNewContainer (children) {
		return $('<div class="navigate-container"></div>').append(children);
	}

	function enhanceOptions (_options) {
		options = $.extend(options, _options, {
			_status: 'done',
			_funcs: [],
			_invoke: function (func, args, context) {
				if (this._status === 'done') {
					func.apply(context, args);
					return;
				} 
				this._funcs.push({
					func: func,
					arguments: args,
					context: context
				});
			},
			async: function () {
				var self = this;
				self._status = 'wait';

				return function () {
					self._status = 'done';
					$.each(self._funcs, function (index, item) {
						self._invoke(item.func, item.arguments, item.context);
					});	
					self._funcs = [];
				};
			}
		});

		return options;
	}

	function wrapContainer ($container, options) {
		var $newContainer = createNewContainer();
		var status = 'loaded';

		var responses = {
			fetching: function (type) {
				$newContainer = createNewContainer();
				$container.after($newContainer);
				options['on' + type]($container, $newContainer);
			},

			loaded: function (url, html, type) {
				var $html = htmlDoc(html);
				options._invoke(function () {
					if (type !== 'Back') {
			    		history.pushState({}, 'title', url);
					}
					updateContent($html, $container, $newContainer, options['on'+ type + 'Render'].bind(options, $container));
				});
			},

			error: function (url) {
				location.href = url;
			}
		};

		function load (url, type) {
			if (status === 'loading') {
				return;
			}
			status = 'loading';
			responses['fetching'](type);
		    $.ajax({
		    	url: url,
		    	success: function (html) {
		    		responses['loaded'](url, html, type);
		    	},
		    	error: function () {
		    		responses['error'](url);
		    	},
		    	complete: function () {
		    		status = 'loaded';
		    	}
		    });
		}

		function bindEventHandlers () {
			$container.on('click', 'a', function (e) {
				var $anchor = $(e.currentTarget);

				// if (typeof $anchor.attr(options.attr) !== 'string') {
				// 	return;
				// }
				var url = $anchor.prop('href');
				if (url.indexOf('history.back()') > -1) {
					return;
				}
				e.preventDefault();			

				load(url, 'Forward');
			});

			$(window).on('popstate', function () {
				load(location.href, 'Back');
			});	
		}

		bindEventHandlers();
	}

	function SmoothNavigate ($container, _options) {
		if (!history.pushState ||
			!history.replaceState ||
			!$container.attr('id')) {
			return;
		}

		enhanceOptions(_options);
		wrapContainer($container, options);
	}

	return SmoothNavigate;
});