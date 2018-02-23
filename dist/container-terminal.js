/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2015 Red Hat, Inc.
 *
 * Cockpit is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * Cockpit is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 */

(function(root, factory) {
    if (typeof(define) === 'function' && define.amd)
        define(["angular", "term" ], factory);
    else
        factory(root.angular, root.Terminal);
}(this, function(angular, Terminal) {
    "use strict";

    /* The kubernetesUI component is quite loosely bound, define if it doesn't exist */
    try { angular.module("kubernetesUI"); } catch(e) { angular.module("kubernetesUI", []); }

    // https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/btoa
    function utf8_to_b64( str ) {
        return window.btoa(window.unescape(encodeURIComponent( str )));
    }
    function b64_to_utf8( str ) {
        return decodeURIComponent(window.escape(window.atob( str )));
    }

    return angular.module('kubernetesUI')
        .provider('kubernetesContainerSocket', function() {
            var self = this;

            /* The default WebSocketFactory */
            self.WebSocketFactory = function() {
                return function ContainerWebSocket(url, protocols) {
                    if (url.indexOf("/") === 0) {
                        if (window.location.protocol === "http:")
                            url = "ws://" + window.location.host + url;
                        else
                            url = "wss://" + window.location.host + url;
                    }
                    return new window.WebSocket(url, protocols);
                };
            };

            function load(injector, name) {
                if (!name)
                    throw "no WebSocketFactory set";
                else if (angular.isString(name))
                    return injector.get(name, "kubernetesContainerSocket");
                else
                    return injector.invoke(name);
            }

            self.$get = [
                "$injector",
                function($injector) {
                    return load($injector, self.WebSocketFactory);
                }
            ];
        })
        .directive('kubernetesContainerTerminal', [
            "$q", "kubernetesContainerSocket",
            function($q, kubernetesContainerSocket) {
                return {
                    restrict: 'E',
                    scope: {
                        pod: '&',
                        container: '&',
                        command: '=?',
                        prevent: '=?',
                        rows: '=?',
                        cols: '=?',
                        screenKeys: '=?',
                        autofocus: '=?',
                        status: '=?'
                    },
                    link: function(scope, element, attrs) {
                        scope.status = 'disconnected';

                        /* term.js wants the parent element to build its terminal inside of */
                        var outer = angular.element("<div class='terminal-wrapper'>");
                        element.append(outer);

                        var spinner = angular.element("<div class='spinner spinner-inverse hidden'>");

                        var button = angular.element("<button class='btn btn-default fa fa-refresh'>");
                        button.on("click", connect).attr("title", "Connect");

                        element.append(angular.element("<div class='terminal-actions'>")
                                            .append(spinner).append(button));

                        var alive = null;
                        var ws = null;
                        var defaultCols = 80;
                        var defaultRows = 24;

                        var term = new Terminal({
                            cols: scope.cols || defaultCols,
                            rows: scope.rows || defaultRows,
                            cursorBlink: true,
                            fontFamily: "'Courier New', 'Courier', monospace",
                            fontSize: 12,
                            lineHeight: 1,
                            theme: {
                              foreground: "#f0f0f0"
                            },
                            screenKeys: scope.screenKeys || true,
                            applicationCursor: true, // Needed for proper scrollback behavior in applications like vi
                            mouseEvents: true        // Needed for proper scrollback behavior in applications like vi
                        });

                        outer.empty();
                        term.open(outer[0]);
                        term.cursorHidden = true;
                        term.refresh(term.buffer.y, term.buffer.y);

                        term.on('data', function(data) {
                            if (ws && ws.readyState === 1)
                                ws.send("0" + utf8_to_b64(data));
                        });

                        var sizeViewport = function () {
                          var cols = scope.cols || defaultCols;
                          if (!term.charMeasure.width) {
                            return;
                          }
                          var xtermViewport = element[0].getElementsByClassName("xterm-viewport")[0];
                          // character width * number of columns + space for a scrollbar
                          // TODO determine the max width of a scrollbar across browsers
                          xtermViewport.style.width = (term.charMeasure.width * cols + 17) + "px";
                        };

                        term.charMeasure.on('charsizechanged', sizeViewport);

                        var sizeTerminal = function() {
                          var cols = scope.cols || defaultCols;
                          var rows = scope.rows || defaultRows;
                          term.resize(cols, rows);
                          sizeViewport();
                          if (ws && ws.readyState === 1) {
                            ws.send("4" + window.btoa('{"Width":' + cols + ',"Height":' + rows + '}'));                
                          }
                        };

                        function connect() {
                            disconnect();

                            term.reset();

                            var url = "";

                            var pod = scope.pod();
                            if (pod.metadata)
                                url += pod.metadata.selfLink;
                            else
                                url += pod;
                            url += "/exec";

                            if (url.indexOf('?') === -1)
                                url += '?';
                            url += "stdout=1&stdin=1&stderr=1&tty=1";

                            var container = scope.container ? scope.container() : null;
                            if (container)
                                url += "&container=" + encodeURIComponent(container);

                            var command = scope.command;
                            if (!command)
                                command = [ "/bin/sh", "-i" ];
                            if (typeof (command) === "string")
                                command = [ command ];
                            command.forEach(function(arg) {
                                url += "&command=" + encodeURIComponent(arg);
                            });

                            var first = true;
                            spinner.removeClass("hidden");
                            button.addClass("hidden");

                            function fatal(message) {
                                if (!message && first)
                                    message = "Could not connect to the container. Do you have sufficient privileges?";
                                if (!message)
                                    message = "disconnected";
                                if (!first)
                                    message = "\r\n" + message;
                                term.write('\x1b[31m' + message + '\x1b[m\r\n');
                                scope.status = 'disconnected';
                                scope.$apply(disconnect);
                            }

                            $q.when(kubernetesContainerSocket(url, "base64.channel.k8s.io"),
                                function resolved(socket) {
                                    ws = socket;

                                    ws.onopen = function(ev) {
                                        alive = window.setInterval(function() {
                                            ws.send("0");
                                        }, 30 * 1000);
                                        // make sure terminal is reset to the right size in case the terminal was resized while the connection was opening
                                        sizeTerminal();                    
                                    };

                                    ws.onmessage = function(ev) {
                                        var data = ev.data.slice(1);
                                        switch(ev.data[0]) {
                                        case '1':
                                        case '2':
                                        case '3':
                                            term.write(b64_to_utf8(data));
                                            break;
                                        }
                                        if (first) {
                                            first = false;
                                            spinner.addClass("hidden");
                                            button.addClass("hidden");
                                            term.cursorHidden = false;
                                            term.showCursor();
                                            if (scope.autofocus && term.element) {
                                              term.focus();
                                            }
                                        }
                                    };

                                    ws.onclose = function(ev) {
                                        scope.status = 'disconnected';
                                        fatal(ev.reason);
                                    };
                                },
                                function rejected(ex) {
                                    fatal(ex.message);
                                }
                            );
                            scope.status = 'connected';
                        }

                        function disconnect() {
                            scope.status = 'disconnected';
                            spinner.addClass("hidden");
                            button.removeClass("hidden");

                            /* There's no term.hideCursor() function */
                            if (term) {
                                term.cursorHidden = true;
                                term.refresh(term.buffer.y, term.buffer.y);
                            }

                            if (ws) {
                                ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
                                if (ws.readyState < 2) // CLOSING
                                    ws.close();
                                ws = null;
                            }

                            window.clearInterval(alive);
                            alive = null;
                        }

                        scope.$watchGroup(["cols", "rows"], sizeTerminal);

                        scope.$watch("prevent", function(prevent) {
                            if (!prevent)
                                connect();
                        });

                        scope.$on("$destroy", function() {
                            if (term)
                                term.destroy();
                            disconnect();
                        });
                    }
                };
            }
        ]);
}));
