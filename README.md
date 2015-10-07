Kubernetes Container Terminal
=============================

Provides a simple container TTY for Kubernetes pods.

#### Disclaimer
This is an early implementation and is subject to change.

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

Now include the graph:

```xml
<kubernetes-container-terminal >
</kubernetes-container-terminal>
```

Documentation
-------------

#### =url

An optional base URL of the API endpoint. If a ```resource``` is specified, then
the ```resource.metadata.selfLink``` will be added to this URL. If no resource
is specified, then the url will will be used as is. If not specified, then the
URL will be automatically determined from the current document location. This URL
should start with either ```ws://``` or ```wss://```.

#### =resource

An optional Kubernetes resource Pod object. If set, the ```resource.metadata.selfLink```
will be added to the ```url```.

#### =container

The name of the container in the Pod to open the terminal for. If not specified then
Kubernetes will connect to one of the containers.

#### =command

The command to run. Either an executable string, or an array containing the executable
and all the arguments. If not specified will default to running an interactive shell.

#### =state

Reflects the current state of the connection. These are the same as the WebSocket
readyState constants. The following values:

 * CONNECT = null
 * CONNECTING = 0
 * OPEN = 1
 * CLOSING = 2
 * CLOSED = 3

In particular, if the caller sets the state to CLOSED or CLOSING, then the terminal
will close its connection. If the state is set to CONNECT then the terminal will
connect (or reconnect), and change the state as it does so.

#### =constructor

Optional constructor function to use to create the WebSocket.


Styling
-------

See ```container-terminal.css``` for an example default look and feel.

Contributing
------------

Git clone this repo and run `grunt serve`. While the server is running, any time changes
are made to the JS or HTML files the build will run automatically.  Before committing any
changes run the `grunt build` task to make sure dist/container-terminal.js has been updated
and include the updated file in your commit.
