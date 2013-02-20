/**
 * @license ur-file v0.1a
 * (c) 2013 Union of RAD, LLC http://union-of-rad.com/
 * License: BSD
 */


/**
 * The ur.file module implements native support for file uploads through 
 */
angular.module('ur.file', []).config(['$provide', function($provide) {

	/**
	 * XHR initialization, copied from Angular core, because it's buried inside $HttpProvider.
	 */
	var XHR = window.XMLHttpRequest || function() {
		try { return new ActiveXObject("Msxml2.XMLHTTP.6.0"); } catch (e1) {}
		try { return new ActiveXObject("Msxml2.XMLHTTP.3.0"); } catch (e2) {}
		try { return new ActiveXObject("Msxml2.XMLHTTP"); } catch (e3) {}
		throw new Error("This browser does not support XMLHttpRequest.");
	};

	/**
	 * Convert object hash into HTML form, for legacy browsers that don't support HTML5 file
	 * uploads. Not currently in use.
	 *
	 * @todo Rewrite to eliminate jQuery dependency.
	 */
	function objectToForm(id, data) {
		var $form = $('<form method="POST" enctype="multipart/form-data" />');
			$form.attr({ id: 'form' + id, target: 'uploader' + id });

		function append(data, path) {
			for (var n in data) {
				var value = data[n];

				if (typeof value === 'function') {
					continue;
				}

				if (value.$proxy && angular.isElement(value.$proxy)) {
					var $proxy = angular.element(value.$proxy);
					$proxy.data('parent', $proxy.parent());
					$form.append(value.$proxy);
					continue;
				}
				n = path ? path + '[' + n + ']' : n;

				if (angular.isObject(value) || angular.isArray(value)) {
					append(value, n);
					continue;
				}
				value = (value === undefined || value === null) ? '' : value;

				$form.append('<input type="hidden" name="' + n + '" value="' + value + '" />');
			}
		};
		append(data);

		return $form.appendTo($('body')).hide();
	};

	/**
	 * Convert object hash to HTML5 FormData object, for uploads that include additional data. Not
	 * currently in use.
	 *
	 * @todo Implement me.
	 */
	function objectToFormData(object) {
		var data = new FormData();

		for (var n in data) {
			var value = data[n];

			if (typeof value === 'function') {
				continue;
			}
		}
	};

	/**
	 * Initializes XHR object with parameters from $httpBackend.
	 */
	function prepXHR(method, url, headers, callback, withCredentials, type) {
		var xhr = new XHR();
		var status;

		xhr.open(method, url, true);

		if (type) {
			xhr.type = type;
			headers['Content-Type'] = type;
		}

		angular.forEach(headers, function(value, key) {
			(value) ? xhr.setRequestHeader(key, value) : null;
		});

		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4) {
				var response = xhr.response || xhr.responseText;
				callback(status = status || xhr.status, response, xhr.getAllResponseHeaders());
			}
		};

		if (withCredentials) {
			xhr.withCredentials = true;
		}
		return xhr;
	};

	/**
	 * Initializes an HTML form and iframe target, for legacy browsers that don't support HTML5
	 * file uploads. Not currently in use.
	 *
	 * @todo Rewrite to eliminate jQuery dependency.
	 * @todo Finish implementation.
	 */
	function iFramePost(method, url, post, callback, headers, timeout, withCredentials, type) {
		with (Math) { var id = round(random() * 100000000000) };

		var $form = objectToForm(id, post);
		var $iframe = $('<iframe name="uploader' + id + '" id="uploader' + id + '" />');

		$iframe.appendTo($("body")).hide();
		$form.attr('action', url + '.jsonp?callback=callback' + id);

		$window[0]['callback' + id] = function() {
			callback.apply([].slice.call(arguments));

			$.each($form.find('input'), function() {
				// @todo: Re-attach to angular.element(this).data('parent')
			});

			$form.remove();
			$iframe.remove();
			delete $window[0]['callback' + id];
		};
		$form.submit();
	};

	/**
	 * Hook into $httpBackend to intercept requests containing files.
	 */
	$provide.decorator('$httpBackend', function($delegate, $window) {
		return function(method, url, post, callback, headers, timeout, wc) {

			var containsFile = false, isLegacy = false, result = null;

			if (angular.isObject(post)) {
				containsFile = hasFile(post);
				isLegacy = hasFile(post, true);
			}

			if (isLegacy) {
				return iFramePost(method, url, post, callback, $window);
			}

			if (post instanceof File) {
				headers['X-File-Name'] = post.name;
				headers['X-File-Size'] = post.size;
				headers['X-File-Last-Modified'] = post.lastModifiedDate;
				return prepXHR(method, url, headers, callback, wc, post.type).send(post);
			}

			if (containsFile) {
				// @todo
			}
			$delegate(method, url, post, callback, headers, timeout, wc);
		};
	});

	/**
	 * Checks an object hash to see if it contains a File object, or, if legacy is true, checks to
	 * see if an object hash contains an <input type="file" /> element.
	 */
	var hasFile = function(data, legacy) {
		for (n in data) {
			if (!legacy && data[n] instanceof File) {
				return true;
			}
			if (legacy && angular.isElement(data[n])) {
				var attrs = data[n].attributes;

				if (attrs && attrs.type === "file") {
					return true;
				}
			}
			if ((angular.isObject(data[n]) || angular.isArray(data[n])) && hasFile(data[n])) {
				return true;
			}
		}
		return false;
	};

	/**
	 * Prevents $http from executing its default transformation behavior if the data to be
	 * transformed contains file data.
	 */
	$provide.decorator('$http', function($delegate) {
		var transformer = $delegate.defaults.transformRequest[0];

		$delegate.defaults.transformRequest = [function(data) {
			return hasFile(data) ? data : transformer(data);
		}];
		return $delegate;
	});

}]).directive('urFile', ['$parse', function urFileFactory($parse) {

	/**
	 * Binding for file input elements
	 */
	return {
		scope: false,
		link: function urFilePostLink(scope, element, attrs) {

			if (!attrs.type || attrs.type.toLowerCase() !== 'file') {
				return;
			}

			element.bind('change', function(e) {
				if (!e.target.files || !e.target.files.length || !e.target.files[0]) {
					return true;
				}
				var fileData = attrs.multiple ? e.target.files : e.target.files[0];

				scope.$apply(function(scope) {
					$parse(attrs.urFile).assign(scope, fileData);
				});
				attrs.urChange ? scope.$eval(attrs.urChange) : null;
			});
		}
	}

}]);