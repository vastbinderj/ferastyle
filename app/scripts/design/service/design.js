(function (define) {
    "use strict";

    define(["angular", "design/init"], function (angular, designModule) {
        designModule
        /**
         *  $designService allows to do operations over very top HTML page
         */
            .service("$designService", [function () {

                return {
                    getTopPage: function () {
                        return this.getTemplate("index.html");
                    },

                    getTemplate: function (templateName) {
                        return "theme/views/" + templateName;
                    },

                    getImage: function (img) {
                        return "theme/images/" + img;
                    }
                };
            }]);

        return designModule;
    });
})(window.define);
