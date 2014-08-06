(function (define) {
    "use strict";

    define([
            "angular",
            "angular-route",
            "angular-resource"
        ],
        function (angular) {
            /*
             *  Angular "checkoutModule" declaration
             */
            angular.module.checkoutModule = angular.module("checkoutModule", ["ngRoute", "ngResource", "designModule"])

                /*
                 *  Basic routing configuration
                 */
                .config(["$routeProvider", function ($routeProvider) {
                    $routeProvider
                        .when("/checkout", { templateUrl: "views/default/checkout/view.html", controller: "checkoutController" });
                }]);

            return angular.module.checkoutModule;
        });

})(window.define);