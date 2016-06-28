Kubernetes Container Terminal
=============================

Provides a simple container TTY for Kubernetes pods.

#### Disclaimer
This is an early implementation and is subject to change.

Requires: [https://github.com/kubernetes/kubernetes/pull/13885](https://github.com/kubernetes/kubernetes/pull/13885)

![Screenshot](https://raw.githubusercontent.com/kubernetes-ui/container-terminal/master/scratch/sceenshot.png)

Getting Started
---------------

The kubernetes terminal is provided in the kubernetes-container-terminal bower package.

To get the kubernetes-container-terminal bower component in another project, run:

```
bower install kubernetes-container-terminal --save
```

To see a simple running example git clone this repo and run

```
npm install
grunt depends
firefox index.html
```

This will install any required dependencies necessary to run the ```index.html``` demo.

Usage
-----

Include the JS and CSS files, after angularjs and d3:

```xml
<script src="bower_components/angular/angular.js"></script>
<script src="bower_components/term.js/src/term.js"></script>
<script src="bower_components/kubernetes-container-terminal/dist/container-terminal.js"></script>
<link rel="stylesheet" href="bower_components/kubernetes-container-terminal/dist/container-terminal.css" />
```

Make sure your angular app / module includes ```kubernetesUI``` as a module dependency.

```
angular.module('exampleApp', ['kubernetesUI'])
```

Now include the terminal in your HTML. You must already have a pod resource, or a string
URL in the current scope you pass to the terminal for its initialization.

```xml
<kubernetes-container-terminal pod="pod_resource">
</kubernetes-container-terminal>
```

Documentation
-------------

#### &pod

Required. Either a URL path of the pod as a string, or a Kubernetes resource Pod object.
If the latter then ```resource.metadata.selfLink``` will be used as the URL.

#### &container

The name of the container in the Pod to open the terminal for. If not specified then
Kubernetes will connect to one of the containers.

#### @command

The command to run. Either an executable string, or an array containing the executable
and all the arguments. If not specified will default to running an interactive shell.

#### =prevent

If set to ```true``` then the widget will not start connecting automatically. It will
wait for either user action or for the ```prevent``` flag to be cleared.

#### =status

Reports the connectivity status of the terminal back to the parent scope. The two
states currently implemented are ```connected``` and ```disconnected```. This is
not an input.

#### Container Socket Service

There is a container socket service that the terminal widget uses to create the
WebSocket objects. The default implementation uses the current document location
to qualify the ```pod``` URL.

You can specify a custom Factory like this:

```javascript
angular.module("myFancyThings")
    .config(function(kubernetesContainerSocketProvider) {
        kubernetesContainerSocketProvider.WebSocketFactory = "MyWebSockets";
    })
    .factory("MyWebSockets", function() {
        return function MyWebSocket(url, protocols) {
            url = "wss://example.com" + url + "&access_token=blahblahblah";
            return new WebSocket(url, protocols);
        };
    });
```

Styling
-------

See ```container-terminal.css``` for an example default look and feel.

Contributing
------------

Git clone this repo and run `grunt serve`. While the server is running, any time changes
are made to the JS or HTML files the build will run automatically.  Before committing any
changes run the `grunt build` task to make sure dist/container-terminal.js has been updated
and include the updated file in your commit.
