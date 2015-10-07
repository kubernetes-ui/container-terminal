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
        define(["base1/angular", "base1/term" ], factory);
    else
        factory(root.angular, root.Terminal);
}(this, function(angular, Terminal) {
    "use strict";

    /* The kubernetesUI component is quite loosely bound, define if it doesn't exist */
    try { angular.module("kubernetesUI"); } catch(e) { angular.module("kubernetesUI", []); }

    return angular.module('kubernetesUI')
        .directive('kubernetesContainerTerminal', [
            function() {
                return {
                    restrict: 'E',
                    scope: {
                        state: '=',
                        url: '=',
                        resource: '=',
                        container: '=',
                        constructor: '=',
                        command: '@'
                    },
                    link: function(scope, element, attrs) {
                        /* term.js wants the parent element to build its terminal inside of */
                        var outer = angular.element("<div class='terminal-wrapper'>");
                        element.append(outer);

                        var spinner = angular.element("<div class='spinner spinner-white hidden'>");

                        var button = angular.element("<button class='btn btn-default fa-refresh hidden'>");
                        button.on("click", connect);

                        element.append(angular.element("<div class='terminal-actions'>")
                                            .append(spinner).append(button));

                        var alive = null;
                        var term = null;
                        var ws = null;

                        var access_token = "6YN2CM5YzlQkY86FbK2pL1lbz1Nl8JKz9W5b1ki9RyM";

                        function locate() {
                            if (scope.url)
                                return scope.url;
                            var window_loc = window.location.toString();
                            if (window_loc.indexOf('http:') === 0)
                                return "ws://" + window.location.host + "/api/v1";
                            else if (window_loc.indexOf('https:') === 0)
                                return "wss://" + window.location.host + "/api/v1";
                            else
                                throw "Use the container-terminal over http or https";
                        }

                        function connect() {
                            disconnect();

                            var url = locate();
                            if (scope.resource) {
                                if (scope.resource.metadata)
                                    url += scope.resource.metadata.selfLink;
                                else
                                    url += scope.resource;
                                url += "/exec";
                            }

                            if (url.indexOf('?') === -1)
                                url += '?';
                            url += "stdout=1&stdin=1&stderr=1&tty=1";
                            if (scope.container)
                                url += "&container=" + encodeURIComponent(scope.container);

                            var command = scope.command;
                            if (!command)
                                command = [ "/bin/sh", "-i" ];
                            if (typeof (command) === "string")
                                command = [ command ];
                            command.forEach(function(arg) {
                                url += "&command=" + encodeURIComponent(arg);
                            });

                            var constructor = scope.constructor || window.WebSocket;
                            ws = new constructor(url, "base64.channel.k8s.io");

                            outer.empty();
                            if (term)
                                term.destroy();

                            term = new Terminal({
                                cols: 80,
                                rows: 24,
                                screenKeys: true
                            });

                            term.open(outer[0]);

                            ws.onopen = function(ev) {
                                alive = window.setInterval(function() {
                                    ws.send("0");
                                }, 30 * 1000);
                            };

                            ws.onmessage = function(ev) {
                                var data = ev.data.slice(1);
                                switch(ev.data[0]) {
                                case '1':
                                case '2':
                                case '3':
                                    term.write(atob(data));
                                    break;
                                }
                                if (scope.state != 1) {
                                    scope.$apply(function() {
                                        scope.state = 1; /* OPEN */
                                        spinner.addClass("hidden");
                                        button.addClass("hidden");
                                        term.cursorHidden = false;
                                        term.showCursor();
                                        term.refresh(term.y, term.y);
                                    });
                                }
                            };

                            ws.onclose = function(ev) {
                                var reason = ev.reason || "disconnected";
                                term.write('\x1b[31m' + reason + '\x1b[m\r\n');
                                scope.$apply(disconnect);
                            };

                            term.on('data', function(data) {
                                if (ws && ws.readyState === 1)
                                    ws.send("0" + btoa(data));
                            });

                            scope.state = 0; /* CONNECTING */
                            spinner.removeClass("hidden");
                            button.addClass("hidden");
                        }

                        function disconnect() {
                            spinner.addClass("hidden");
                            button.removeClass("hidden");

                            /* There's no term.hideCursor() function */
                            if (term) {
                                term.cursorHidden = true;
                                term.refresh(term.y, term.y);
                            }

                            if (ws) {
                                ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
                                if (ws.readyState < 2) /* CLOSING */
                                    ws.close();
                                ws = null;
                            }

                            window.clearInterval(alive);
                            alive = null;

                            scope.state = 3; /* CLOSED */
                        }

                        scope.$watch("state", function(state) {
                            if (state === 2 || state === 3) {
                                disconnect();
                            } else if (state === null || !ws) {
                                connect();
                            }
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
