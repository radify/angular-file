## ur.file: Native HTML5-based file input bindings for AngularJS

### Example

```html
<html ng-app="myApp">
<head>
	<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.0.1/angular.min.js"></script>
	<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.0.1/angular-resource.min.js"></script>
	<script src="angular-file.js"></script>
	<script>
		var app = angular.module('myApp', ['ur.file', 'ngResource']);

		app.controller('FileController', function($scope, $resource) {

			var Files = $resource('/files/:id', { id: "@id" });

			angular.extend($scope, {

				model: { file: null },

				upload: function(model) {
					Files.prototype.$save.call(model.file, function(self, headers) {
						// Handle server response
					});
				}
			});
		});
	</script>
</head>
<body ng-controller="FileController">
	<input type="file" ng-model="model.file" change="upload(model)" />
</body>
</html>
```

### What's happening here?

 * `ng-model`: You can now use it for `<input type="file" />` elements, just like normal. Bind it to a scope property, and it will be assigned a `File` object when the file input is populated. However, this is effectively a read-only property, due to the security restrictions around manipulating file uploads with JavaScript.

 * `change`: Typical change event. Triggered when a file is selected.

 * `Files.prototype.$save.call()`: Treats the file object as an instance of `$resource`, and POSTs the raw contents of the file to the configured URL. The upload handler also sets four headers: `X-File-Name`, `X-File-Size`, `X-File-Last-Modified`, and `Content-Type`.

The `X-File-Name` header is encoded with URL encoding. 
