angular.module('commonModule')
.controller('viewController', [
    '$scope',
    '$routeParams',
    'blogApiService',
    'blogService',
    function(
        $scope,
        $routeParams,
        blogApiService,
        blogService
    ) {

        var blogID = $routeParams.id;
        var url = getSeoUrl();

        $scope.blog = {};

        $scope.activate = function() {
            $scope._getBlog();
        };

        $scope._getBlog = function() {

            blogApiService.getBlog({'blogID': blogID
            }).$promise.then(function(response) {
                    $scope.blog = response.result || {};

                    if($scope.blog.extra.prev) {
                        $scope.blog.prev = getSeoUrl($scope.blog.extra.prev._id);
                    } else
                    {
                        $scope.blog.prev = undefined;
                    }

                    if($scope.blog.extra.next) {
                        $scope.blog.next = getSeoUrl($scope.blog.extra.next._id);
                    } else
                    {
                        $scope.blog.next = undefined;
                    }

                    // BREADCRUMBS
                    $scope.$emit("add-breadcrumbs", {
                        "label": $scope.blog.identifier,
                        "url": url
                    });
                });
        };

         function getSeoUrl(id){
            return blogService.getUrl(id);
        }
    }
]);
