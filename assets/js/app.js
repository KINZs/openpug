(function() {
	console.log("Angular loaded!");
	var app = angular.module('openpug', [ ]);

	app.controller('PugController', function($scope) {
		io.socket.on('pug', function(message) {
			console.log(message);
		});
		io.socket.get('/pug', function(res) {
			$scope.pugc.lobbies = res;
			console.log($scope);
			$scope.$apply();
		});
	});
})();

