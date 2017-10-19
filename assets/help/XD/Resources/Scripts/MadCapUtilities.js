/// <reference path="jquery.js" />
/// <reference path="MadCapGlobal.js" />

/*!
 * Copyright MadCap Software
 * http://www.madcapsoftware.com/
 * Unlicensed use is strictly prohibited
 *
 * v13.3.6494.23016
 */


(function () {
    MadCap.CreateNamespace("Utilities");

    //
    // Class Dictionary
    //

    MadCap.Utilities.Dictionary = function (ignoreCase) {
        this._Map = new Object();
        this._Overflows = new Array();
        this._Length = 0;
        this._IgnoreCase = ignoreCase == true;
    };

    var Dictionary = MadCap.Utilities.Dictionary;

    Dictionary.prototype.GetLength = function (key) {
        return this._Length;
    };

    Dictionary.prototype.ForEach = function (func) {
        var map = this._Map;

        for (var key in map) {
            var value = map[key];

            var ret = func(key, value);

            if (ret != undefined && !ret) {
                return;
            }
        }

        var overflows = this._Overflows;

        for (var i = 0, length = overflows.length; i < length; i++) {
            var item = overflows[i];

            var ret = func(item.Key, item.Value);

            if (ret != undefined && !ret) {
                return;
            }
        }
    };

    Dictionary.prototype.GetItem = function (key) {
        if (this._IgnoreCase)
            key = key.toLowerCase();

        var item = null;

        if (typeof (this._Map[key]) == "function") {
            var index = this.GetItemOverflowIndex(key);

            if (index >= 0) {
                item = this._Overflows[index].Value;
            }
        }
        else {
            item = this._Map[key];

            if (typeof (item) == "undefined") {
                item = null;
            }
        }

        return item;
    };

    Dictionary.prototype.GetItemOverflowIndex = function (key) {
        if (this._IgnoreCase)
            key = key.toLowerCase();

        var overflows = this._Overflows;

        for (var i = 0, length = overflows.length; i < length; i++) {
            if (overflows[i].Key == key) {
                return i;
            }
        }

        return -1;
    }

    Dictionary.prototype.Remove = function (key) {
        if (this._IgnoreCase)
            key = key.toLowerCase();

        if (typeof (this._Map[key]) == "function") {
            var index = this.GetItemOverflowIndex(key);

            if (index >= 0) {
                this._Overflows.splice(index, 1);

                this._Length--;
            }
        }
        else {
            if (typeof (this._Map[key]) != "undefined") {
                delete (this._Map[key]);

                this._Length--;
            }
        }
    };

    Dictionary.prototype.Add = function (key, value) {
        if (this._IgnoreCase)
            key = key.toLowerCase();

        if (typeof (this._Map[key]) == "function") {
            var item = this.GetItem(key);

            if (item != null) {
                this.Remove(key);
            }

            this._Overflows[this._Overflows.length] = { Key: key, Value: value };
        }
        else {
            this._Map[key] = value;
        }

        this._Length++;
    };

    Dictionary.prototype.AddUnique = function (key, value) {
        if (this._IgnoreCase)
            key = key.toLowerCase();

        var savedValue = this.GetItem(key);

        if (typeof (savedValue) == "undefined" || !savedValue) {
            this.Add(key, value);
        }
    };

    //
    // End class Dictionary
    //

    //
    // Class DateTime
    //

    MadCap.Utilities.DateTime = function (dateString) {
        var dateRegex = /\/Date\(([0-9]+)\)\//i;
        var dateMatch = dateRegex.exec(dateString);

        if (dateMatch != null) {
            this.Date = new Date(parseInt(dateMatch[1]));
        }
        else {
            this.Date = new Date(dateString);
        }
    };

    var DateTime = MadCap.Utilities.DateTime;

    DateTime.Months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    //
    // End class DateTime
    //

    //
    // Class TimeSpan
    //

    MadCap.Utilities.TimeSpan = function (fromDate, toDate) {
        if (typeof fromDate == "undefined") {
            fromDate = new Date();
        }

        if (typeof toDate == "undefined") {
            toDate = new Date();
        }

        if (fromDate > toDate) {
            this.FromDate = toDate;
            this.ToDate = fromDate;
        }
        else {
            this.FromDate = fromDate;
            this.ToDate = toDate;
        }

        this.Ticks = this.ToDate - this.FromDate;
        this.Seconds = this.Ticks / 1000;
        this.Minutes = this.Seconds / 60;
        this.Hours = this.Minutes / 60;
        this.Days = this.Hours / 24;
    };

    var TimeSpan = MadCap.Utilities.TimeSpan;

    TimeSpan.prototype.ToDurationString = function () {
        if (this.Minutes < 1)
            return "Just now";
        if (this.Hours < 1)
            return parseInt(this.Minutes) + " minutes ago";
        if (this.Days < 1)
            return parseInt(this.Hours) + " hours ago";
        if (this.Days < 30)
            return parseInt(this.Days) + " days ago";

        var dateString = DateTime.Months[this.FromDate.getMonth()] + " " + this.FromDate.getDate();

        if (this.FromDate.getFullYear() != this.ToDate.getFullYear())
            dateString += ", " + this.FromDate.getFullYear();

        return dateString;
    };

    //
    // End class TimeSpan
    //

    //
    // Class Url
    //

    MadCap.Utilities.Url = function (src) {
        // Private member variables

        var _Self = this;
        var _ParseRegex = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/;

        // Private properties

        this._Segments = [];

        // Public properties

        this.FullPath = null;
        this.Path = null;
        this.PlainPath = null;
        this.Name = null;
        this.Extension = null;
        this.NameWithExtension = null;
        this.FullFragment = null;
        this.Fragment = null;
        this.Query = null;
        this.Origin = null;
        this.IsAbsolute = false;
        this.IsRootRelative = false;
        this.IsFolder = false;
        this.QueryMap = new MadCap.Utilities.Dictionary(true);
        this.HashMap = new MadCap.Utilities.Dictionary(true);

        // Constructor

        (function () {
            var fragment = "";
            var fullFragment = "";
            var query = "";
            var origin = "";
            var fragmentPos = src.indexOf("#");
            var queryPos = src.indexOf("?");

            if (fragmentPos != -1) {
                fullFragment = src.substring(fragmentPos);

                if (fragmentPos > queryPos) {
                    fragment = src.substring(fragmentPos);
                }
                else {
                    fragment = src.substring(fragmentPos, queryPos);
                }
            }

            if (queryPos != -1) {
                if (queryPos > fragmentPos) {
                    query = src.substring(queryPos);
                }
                else {
                    query = src.substring(queryPos, fragmentPos);
                }
            }

            var pos = fragmentPos > -1 ? (queryPos > -1 ? Math.min(fragmentPos, queryPos) : fragmentPos) : queryPos;
            var plainPath = src.substring(0, pos == -1 ? src.length : pos);
            pos = plainPath.lastIndexOf("/");
            var path = plainPath.substring(0, pos + 1);
            var nameWithExt = plainPath.substring(pos + 1);
            pos = nameWithExt.lastIndexOf(".");
            var name = nameWithExt.substring(0, pos);
            var ext = nameWithExt.substring(pos + 1);

            var scheme = "";
            pos = plainPath.indexOf(":");

            if (pos >= 0) {
                scheme = plainPath.substring(0, pos);
            }

            var isAbsolute = !MadCap.String.IsNullOrEmpty(scheme);

            if (!MadCap.String.IsNullOrEmpty(src)) {
                var segSrc = src;

                if (MadCap.String.EndsWith(segSrc, "/"))
                    segSrc = segSrc.substring(0, segSrc.length - 1);

                _Self._Segments = segSrc.split("/");

                if (isAbsolute) {
                    var parsedParts = src.match(_ParseRegex);
                    if (parsedParts) {
                        if (parsedParts[4]) { // has port
                            origin = parsedParts[1] + ':' + parsedParts[2] + parsedParts[3] + ':' + parsedParts[4];
                        } else {
                            origin = parsedParts[1] + ':' + parsedParts[2] + parsedParts[3];
                        }

                        _Self.Origin = origin;
                    }
                }
            }

            _Self.FullPath = src;
            _Self.Path = path;
            _Self.PlainPath = plainPath;
            _Self.Name = name;
            _Self.Extension = ext;
            _Self.NameWithExtension = nameWithExt;
            _Self.Scheme = scheme;
            _Self.IsAbsolute = isAbsolute;
            _Self.IsRootRelative = MadCap.String.StartsWith(plainPath, "/", false);
            _Self.IsFolder = MadCap.String.EndsWith(plainPath, '/');
            _Self.FullFragment = fullFragment;
            _Self.Fragment = fragment;
            _Self.Query = query;

            //

            var search = _Self.Query;

            if (!MadCap.String.IsNullOrEmpty(search)) {
                search = search.substring(1);
                search = search.replace(/\+/g, " ");

                Parse(search, "&", _Self.QueryMap);
            }

            var hash = _Self.Fragment;

            if (!MadCap.String.IsNullOrEmpty(hash)) {
                hash = hash.substring(1);

                Parse(hash, "&", _Self.HashMap);
            }

            function Parse(item, delimiter, map) {
                var split = item.split(delimiter);

                for (var i = 0, length = split.length; i < length; i++) {
                    var part = split[i];
                    var index = part.indexOf("=");
                    var key = null;
                    var value = null;

                    if (index >= 0) {
                        key = decodeURIComponent(part.substring(0, index));
                        value = decodeURIComponent(part.substring(index + 1));
                    }
                    else {
                        key = part;
                    }

                    map.Add(key, value);
                }
            }
        })();
    };

    var Url = MadCap.Utilities.Url;

    // Static

    Url.GetDocumentUrl = function () {
        return new Url(document.location.href);
    };

    Url.GetAbsolutePath = function(path) {
        var currentUrl = Url.GetDocumentUrl();
        var root = new MadCap.Utilities.Url(currentUrl.PlainPath);
        if (!root.IsFolder)
            root = root.ToFolder();
        return root.CombinePath(path).FullPath;
    };

    Url.StripInvalidCharacters = function (url) {
        return url.replace(/(javascript:|data:|[<>])/gi, '');
    };

    Url.ReplaceReservedCharacters = function (url, replacement) {
        var reservedChars = /[ ()&;,!'$]/;
        var chars = url.split('');
        for (var i = 0; i < chars.length; i++) {
            if (chars[i].charCodeAt(0) > 127 || chars[i].match(reservedChars)) {
                chars[i] = replacement;
            }
        }
        return chars.join('');
    };

    Url.Navigate = function (url) {
        document.location = Url.StripInvalidCharacters(url);
    };

    Url.GenerateNavigateTopicPath = function (url)
    {
        var path = url.IsRootRelative ? url.PlainPath : Url.GetAbsolutePath(url.PlainPath);

        // keep skin name query parameter
        var skinName = Url.GetDocumentUrl().QueryMap.GetItem("skinName") || url.QueryMap.GetItem("skinName");
        if (skinName != null) {
            path += ("?skinName=" + skinName);
        }

        // Fragment param of clicked url comes BEFORE query params, for search.
        // Also, each search query should retain its escaped chars (e.g. %20 instead of ' ').
        // The url QueryMap converts escaped chars, which messes up the search.
        if (url.FullFragment.indexOf("#search-") == 0) {
            path += url.FullFragment;
        }
        else {
            // add query param(s) of clicked url
            if (url.QueryMap.GetLength() > 0) {
                path += (skinName == null) ? '?' : '&';

                url.QueryMap.ForEach(function (key, value) {
                    var reserved = ["skinName", "highlight"];
                    if (value && reserved.indexOf(key) == -1) {
                        path += (key + "=" + encodeURIComponent(value) + "&");
                    }
                });

                // trim last ampersand
                path = path.slice(0, -1);
            }

            // add fragment param of clicked url
            path += url.Fragment;
        }

        return path;
    }

    Url.NavigateTopic = function (url) {
        var path = Url.GenerateNavigateTopicPath(url);
        Url.Navigate(path);
    };

    Url.OnNavigateTopic = function (e) {
        var href = $(this).attr('href');
        if (typeof href != "undefined") {
            var targetUrl = new Url(href);
            if (!MadCap.String.IsNullOrEmpty(href) && !targetUrl.IsAbsolute && targetUrl.PlainPath) {
                var path = Url.GenerateNavigateTopicPath(targetUrl);
                var pathUrl = new MadCap.Utilities.Url(path);
                var href = new MadCap.Utilities.Url(document.location.href);
                if (decodeURI(pathUrl.PlainPath) == decodeURI(href.PlainPath)) {
                    if (targetUrl.HashMap.GetLength() > 0) {
                        Url.NavigateHash(targetUrl.Fragment);
                        $(window).trigger('hashchange');
                        e.preventDefault();
                    }
                } else if (path != Url.GetAbsolutePath(targetUrl.PlainPath)) {
                    MadCap.Utilities.PreventDefault(e);
                    Url.Navigate(path);
                }
            } else if (targetUrl.HashMap.GetLength() > 0 && targetUrl.Fragment != "#") {
                Url.NavigateHash(targetUrl.Fragment);
                $(window).trigger('hashchange');
                e.preventDefault();
            }
        }
    };

    Url.NavigateHash = function (hash) {
        document.location.hash = Url.StripInvalidCharacters(hash);
    };

    Url.CurrentHash = function () {
        return new MadCap.Utilities.Url(document.location.href).FullFragment;
    };

    //

    Url.prototype.AddFile = function (otherUrl) {
        if (typeof (otherUrl) == "string") {
            otherUrl = new Url(otherUrl);
        }

        if (otherUrl.IsAbsolute) {
            return otherUrl;
        }

        var otherFullPath = otherUrl.FullPath;

        if (otherFullPath.charAt(0) == "/") {
            var loc = document.location;
            var pos = loc.href.lastIndexOf(loc.pathname);
            var rootPath = loc.href.substring(0, pos);

            return new Url(rootPath + otherFullPath);
        }

        var fullPath = this.FullPath;

        if (!MadCap.String.EndsWith(fullPath, "/")) {
            fullPath = fullPath + "/";
        }

        return new Url(fullPath + otherFullPath);
    };

    Url.prototype.CombinePath = function (otherUrl) {
        if (typeof (otherUrl) == "string") {
            otherUrl = new Url(otherUrl);
        }

        if (otherUrl.IsAbsolute) {
            throw new MadCap.Exception(-1, "Cannot combine two absolute paths.");
        }

        var otherFullPath = otherUrl.FullPath;
        var segments = otherUrl.FullPath.split("/");

        var curr = this.FullPath;
        var prefix = "";

        if (this.Origin && otherUrl.IsRootRelative) {
            return new Url(this.Origin + otherFullPath);
        }

        if (this.Scheme == "mk") {
            var pos = curr.indexOf("::");
            prefix = curr.substring(0, pos + "::".length);
            curr = curr.substring(pos + "::".length);
        }

        for (var i = 0, length = segments.length; i < length; i++) {
            var seg = segments[i];

            if (curr.length > 1 && MadCap.String.EndsWith(curr, "/")) {
                curr = curr.substring(0, curr.length - 1);
            }

            if (seg == ".") {
                curr += "/";
            }
            else if (seg == "..") {
                curr = curr.substring(0, curr.lastIndexOf("/") + 1);
            }
            else {
                if (curr != "" && !MadCap.String.EndsWith(curr, "/")) {
                    curr += "/";
                }

                curr += seg;
            }
        }

        curr = prefix + curr;

        return new Url(curr);
    };

    Url.prototype.ToQuery = function (query) {
        var newPath = this.PlainPath + "?" + query + this.Fragment;

        return new Url(newPath);
    };

    Url.prototype.ToFolder = function () {
        var fullPath = this.PlainPath;

        if (MadCap.String.EndsWith(fullPath, "/"))
            fullPath = fullPath.substring(0, fullPath.length - 1);

        var pos = fullPath.lastIndexOf("/");
        var newPath = fullPath.substring(0, pos + 1);

        return new Url(newPath);
    };

    Url.prototype.ToRelative = function (otherUrl) {
        if (typeof (otherUrl) == "string")
            otherUrl = new Url(otherUrl);

        if (this.IsAbsolute != otherUrl.IsAbsolute)
            return this;

        var i = 0;
        var length = otherUrl._Segments.length;
        for (; i < length; i++) {
            var seg1 = this._Segments[i];
            var seg2 = otherUrl._Segments[i];

            if (seg1 != seg2)
                break;
        }

        var relPath = "";
        var offset = MadCap.String.EndsWith(otherUrl.FullPath, "/") ? 0 : 1;

        for (var j = 0; j < length - i - offset; j++) {
            relPath += "../";
        }

        for (var j = i; j < this._Segments.length; j++) {
            if (j > i)
                relPath += "/";

            relPath += this._Segments[j];
        }

        return new Url(relPath);
    };

    Url.prototype.ToExtension = function (newExt) {
        var path = this.FullPath;
        var pos = path.lastIndexOf(".");
        var left = path.substring(0, pos);
        var newPath = left + "." + newExt;

        return new Url(newPath);
    };

    Url.prototype.ToScheme = function (newScheme) {
        var path = this.FullPath;
        pos = path.indexOf(":");

        if (pos < 0)
            return this;

        var newPath = newScheme + ":" + path.substring(pos);

        return new Url(newPath);
    };

    Url.prototype.ToPath = function () {
        return new Url(this.Path);
    }

    Url.prototype.ToPlainPath = function () {
        return new Url(this.PlainPath);
    };

    Url.prototype.ToNoQuery = function () {
        return new Url(this.PlainPath + this.Fragment);
    };

    Url.prototype.ToNoFragment = function () {
        return new Url(this.PlainPath + this.Query);
    };

    //
    // End class Url
    //

    //
    // Class CrossFrame
    //

    MadCap.Utilities.CrossFrame = {};

    var CrossFrame = MadCap.Utilities.CrossFrame;

    CrossFrame.MESSAGE_SEPARATOR = "%%%%%";
    CrossFrame.DATA_SEPARATOR = "^^^^^";
    CrossFrame._MessageID = 0;
    CrossFrame._MessageInfos = new Array();

    // Properties

    CrossFrame._MessageHandlerFuncs = new Array();

    // Functions (static)

    CrossFrame._PostMessage = function (win, message) {
        if (typeof win == 'undefined' || win == null) {
            return;
        }

        if (win.postMessage != null) {
            win.postMessage(message, "*");

            return;
        }

        var e = { data: message, source: window };

        win.MadCap.Utilities.CrossFrame.OnMessage(e);
    };

    CrossFrame.AddMessageHandler = function (HandlerFunc, contextObj) {
        var length = CrossFrame._MessageHandlerFuncs.length;

        CrossFrame._MessageHandlerFuncs[length] = { HandlerFunc: HandlerFunc, ContextObj: contextObj };
    };

    CrossFrame.PostMessageRequest = function (win, message, data, CallbackFunc) {
        /// <summary>Sends a message to the specified window with a request for data.</summary>
        /// <param name="win">The window to send the request to.</param>
        /// <param name="message">The name of the request.</param>
        /// <param name="data">An array containing data to send along with the request.</param>
        /// <param name="CallbackFunc">The callback function to execute when the message is handled.</param>

        CrossFrame._MessageInfos[CrossFrame._MessageID] = CallbackFunc;

        var dataString = "";

        if (data != null) {
            for (var i = 0, length = data.length; i < length; i++) {
                if (i > 0)
                    dataString += CrossFrame.DATA_SEPARATOR;

                dataString += data[i];
            }
        }

        var envelope = "request" + CrossFrame.MESSAGE_SEPARATOR + message + CrossFrame.MESSAGE_SEPARATOR + dataString + CrossFrame.MESSAGE_SEPARATOR + CrossFrame._MessageID;

        CrossFrame._PostMessage(win, envelope);

        CrossFrame._MessageID++;
    };

    CrossFrame._PostMessageResponse = function (win, message, data, messageID) {
        /// <summary>Sends a message to the specified window responding to a request made by that window.</summary>
        /// <param name="win">The window to send the response to.</param>
        /// <param name="message">The name of the request.</param>
        /// <param name="data">An array containing data to send along with the request.</param>
        /// <param name="messageID">The messageID of the original request.</param>

        var dataString = "";

        if (data != null) {
            for (var i = 0, length = data.length; i < length; i++) {
                if (i > 0)
                    dataString += CrossFrame.DATA_SEPARATOR;

                dataString += data[i];
            }
        }

        var envelope = "response" + CrossFrame.MESSAGE_SEPARATOR + message + CrossFrame.MESSAGE_SEPARATOR + dataString + CrossFrame.MESSAGE_SEPARATOR + messageID;

        CrossFrame._PostMessage(win, envelope);

        CrossFrame._MessageID++;
    };

    // <MESSAGE_TYPE>%%%%%<MESSAGE>%%%%%<DATA_1>-----<DATA_2>-----<DATA_N>%%%%%<MESSAGE_ID>
    CrossFrame.OnMessage = function (ev) {
        var e = ev.originalEvent;
        var parts = e.data.split(CrossFrame.MESSAGE_SEPARATOR);
        var messageType = parts[0];
        var message = parts[1];
        var messageData = parts[2];
        var messageID = parseInt(parts[3]);

        var dataValues = null;

        if (!MadCap.String.IsNullOrEmpty(messageData)) {
            dataValues = messageData.split(CrossFrame.DATA_SEPARATOR);

            for (var i = 0, length = dataValues.length; i < length; i++) {
                if (dataValues[i] == "null")
                    dataValues[i] = null;
            }
        }

        if (messageType == "request") {
            var handled = false;
            var fireResponse = true;
            var responseData = new Array();

            for (var i = 0, length = CrossFrame._MessageHandlerFuncs.length; i < length; i++) {
                var handlerData = CrossFrame._MessageHandlerFuncs[i];
                var HandlerFunc = handlerData.HandlerFunc;
                var contextObj = handlerData.ContextObj;

                var handlerReturnData = null;

                if (contextObj != null)
                    handlerReturnData = HandlerFunc.call(contextObj, message, dataValues, responseData, e.source, messageID);
                else
                    handlerReturnData = HandlerFunc(message, dataValues, responseData, e.source, messageID);

                handled = handlerReturnData.Handled;
                fireResponse = handlerReturnData.FireResponse;

                if (handled)
                    break;
            }

            if (!handled) {
                if (message == "DEBUG-AddLine") {
                    var message = dataValues[0];
                    MadCap.DEBUG.Log.AddLine(message);

                    handled = true;
                }
                else if (message == "url") {
                    responseData[responseData.length] = document.location.href;

                    handled = true;
                }
                else if (message == "get-title") {
                    responseData[responseData.length] = document.title;

                    handled = true;
                }
                else if (message == "navigate") {
                    var path = dataValues[0];
                    document.location.href = path;

                    handled = true;
                }
            }

            if (fireResponse)
                CrossFrame._PostMessageResponse(e.source, message, responseData.length > 0 ? responseData : null, messageID);
        }
        else if (messageType == "response") {
            if (CrossFrame._MessageInfos[messageID] != null)
                CrossFrame._MessageInfos[messageID](dataValues);
        }
    };

    if (window.postMessage != "undefined") {
        $(window).bind("message", CrossFrame.OnMessage);
    }
    else {

    }

    //
    // End class CrossFrame
    //

    // Bug fix #87527 - Prevent Default method that handles IE not supporting e.preventDefault()
    MadCap.Utilities.PreventDefault = function (e) {
        e.preventDefault ? e.preventDefault() : event.returnValue = false;
    }

    // Asynchronous foreach, executes a function on each element of an array in sequence
    MadCap.Utilities.AsyncForeach = function (array, fn, callback) {
        array = array.slice(0);

        function processOne() {
            var item = array.shift();

            fn(item, function (result) {
                if (array.length > 0) {
                    processOne();
                }
                else {
                    callback();
                }
            });
        }

        if (array.length > 0) {
            processOne();
        }
        else {
            callback();
        }
    }

    MadCap.Utilities.Now = Date.now || function () { // _.now
        return new Date().getTime();
    }

    MadCap.Utilities.Has = function (obj, key) { // _.has
        return obj != null && Object.prototype.hasOwnProperty.call(obj, key);
    }

    MadCap.Utilities.Debounce = function (func, wait, immediate) { // _.debounce
        var timeout, args, context, timestamp, result;

        var later = function () {
            var last = MadCap.Utilities.Now() - timestamp;

            if (last < wait && last > 0) {
                timeout = setTimeout(later, wait - last);
            }
            else {
                timeout = null;
                if (!immediate) {
                    result = func.apply(context, args);
                    if (!timeout)
                        context = args = null;
                }
            }
        };

        return function () {
            context = this;
            args = arguments;
            timestamp = MadCap.Utilities.Now();
            var callNow = immediate && !timeout;

            if (!timeout)
                timeout = setTimeout(later, wait);
            if (callNow) {
                result = func.apply(context, args);
                context = args = null;
            }

            return result;
        };
    }

    MadCap.Utilities.Memoize = function (func, hasher) { // _.memoize
        var memoize = function (key) {
            var cache = memoize.cache;
            var address = '' + (hasher ? hasher.apply(this, arguments) : key);
            if (!MadCap.Utilities.Has(cache, address)) cache[address] = func.apply(this, arguments);
                return cache[address];
        };
        memoize.cache = {};
        return memoize;
    }

    MadCap.Utilities.IsRuntimeFileType = function (type) {
        return MadCap.Dom.Dataset(document.documentElement, "mcRuntimeFileType") == type;
    }

    MadCap.Utilities.HasRuntimeFileType = function (type) {
        var runtimeFileType = MadCap.Dom.Dataset(document.documentElement, "mcRuntimeFileType");

        return runtimeFileType && runtimeFileType.split(";").indexOf(type) > -1;
    }

    MadCap.Utilities.CreateStylesheet = function (contxt, mediaQuery) {
        var context = contxt || document, stylesheet;

        var style = context.createElement('style');

        if (mediaQuery)
            style.setAttribute('media', mediaQuery);

        context.getElementsByTagName('head')[0].appendChild(style);
        stylesheet = context.styleSheets[context.styleSheets.length - 1];

        return stylesheet;
    }

    // Asynchronous foreach, executes a function on each element of an array in parallel
    MadCap.Utilities.AsyncForeachParallel = function (array, fn, callback) {
        var completed = 0;

        if (array.length === 0) {
            callback(); // done immediately
        }

        var len = array.length;
        for (var i = 0; i < len; i++) {
            fn(array[i], function () {
                completed++;

                if (completed === array.length) {
                    callback();
                }
            });
        }
    }

    MadCap.Utilities.FixLink = function (link, relUrl, prefix, contentFolder) {
        if (!link.IsAbsolute) {
            link = relUrl.CombinePath(link);
            var path = link.FullPath;

            if (!MadCap.String.IsNullOrEmpty(prefix) && prefix != null && contentFolder) {
                link = link.ToRelative(contentFolder);
                path = prefix + link.FullPath;
            }

            return path;
        }
    }

    MadCap.Utilities.IsRTL = function () {
        return $('html').css('direction') === 'rtl';
    }

    MadCap.Utilities.ToggleButtonState = function (buttonEl) {
        var $buttonEl = $(buttonEl);
        var currState = $buttonEl.attr("data-current-state") || "1";
        var nextState = currState == "1" ? 2 : 1;

        MadCap.Utilities.SetButtonState(buttonEl, nextState);
    }

    MadCap.Utilities.SetButtonState = function (buttonEl, newState) {
        var $buttonEl = $(buttonEl);
        var currState = newState == 1 ? 2 : 1;
        var newStateClass = $buttonEl.attr("data-state" + newState + "-class");
        var currStateClass = $buttonEl.attr("data-state" + currState + "-class");

        $buttonEl.attr("data-current-state", newState);
        $buttonEl.removeClass(currStateClass).addClass(newStateClass);
        $buttonEl.attr("title", $buttonEl.attr("data-state" + newState + "-title"));

        if (MadCap.Utilities.HasRuntimeFileType("SkinPreview")) {
            var mcStyle2 = $buttonEl.attr('data-mc-style2');
            if (mcStyle2) { // button has alt state
                var mcStyle1 = $buttonEl.attr('data-mc-style1');
                if (!mcStyle1) {
                    mcStyle1 = $buttonEl.attr('data-mc-style');
                    $buttonEl.attr('data-mc-style1', mcStyle1);
                }

                $buttonEl.attr('data-mc-style', newState == 1 ? mcStyle1 : mcStyle2);
            }
        }
    }

    MadCap.Utilities.LoadHandlers = Object.create(null);

    MadCap.Utilities.LoadScript = function (path, onLoaded, onError) {
        var scriptEl = document.createElement("script");
        scriptEl.src = path;
        scriptEl.type = "text/javascript";

        if (scriptEl.addEventListener) {
            $(scriptEl).error(onError);
            $(scriptEl).load(onLoaded);
        }
        else if (scriptEl.readyState) {
            scriptEl.onreadystatechange = function () {
                if (scriptEl.readyState == "loaded" || scriptEl.readyState == "complete") {
                    onLoaded();
                }
            };
        }

        document.getElementsByTagName("head")[0].appendChild(scriptEl);

        return scriptEl;
    }

    MadCap.Utilities.LoadRegisteredScript = function (path, onLoaded, onError, context) {
        var found = false;
        var scriptItem;
        $('script').each(function (index, item) {
            var src = $(item).attr('src');
            if (!MadCap.String.IsNullOrEmpty(src) && src.toLowerCase() == path.toLowerCase()) {
                found = true;
                scriptItem = item;
            }
        });

        if (found) {
            var name = new MadCap.Utilities.Url(path).Name;
            var loadHandler = MadCap.Utilities.LoadHandlers[name];

            if (loadHandler)
                loadHandler(context);

            onLoaded();
        }
    }

    MadCap.Utilities.LoadScripts = function (scripts, onLoaded, onError, context) {
        MadCap.Utilities.AsyncForeach(scripts,
            function (src, callback) {
                if (!MadCap.String.IsNullOrEmpty(src))
                    MadCap.Utilities.LoadRegisteredScript(src, callback, onError, context);
                else
                    callback();
            }, onLoaded
        );
    }

    MadCap.Utilities.TopicUniqueStyleSheets = Object.create(null);

    MadCap.Utilities.LoadStyleSheets = function (styleSheets, insertAfter) {
        $.each(styleSheets, function (index, href) {
            if (!MadCap.String.IsNullOrEmpty(href))
                MadCap.Utilities.LoadStyleSheetUnique(href, insertAfter);
        });
    }

    MadCap.Utilities.LoadStyleSheetUnique = function (styleSheet, insertAfter) {
        var found = false;

        $('link').each(function (index, item) {
            var href = $(item).attr('href');
            if (!MadCap.String.IsNullOrEmpty(href) && href.toLowerCase() == styleSheet.toLowerCase())
                found = true;
        });

        if (!found) {
            var link = '<link rel="stylesheet" type="text/css" href="{0}" />';

            cssLink = link.replace("{0}", styleSheet);

            if ($('link[href*="' + styleSheet + '"]').length == 0 || !MadCap.String.Contains(styleSheet, "/Topic.css", false)) {
                if (insertAfter)
                    $(cssLink).insertAfter(insertAfter);
                else
                    $('head').append(insertIndex, cssLink);
            }
        }

        MadCap.Utilities.TopicUniqueStyleSheets[styleSheet] = $('link[href*="' + styleSheet + '"]');
    }

    MadCap.Utilities.RemoveTopicStylesheets = function () {
        $.each(MadCap.Utilities.TopicUniqueStyleSheets, function (index, item) {
            $(item).remove();
        });
    }

    MadCap.Utilities.CombineRelevancy = function (relevancy1, relevancy2) {
        var capped = MadCap.Utilities.CapNumber(relevancy1, relevancy2, 0x10, 0, 2);

        for (var i = 2; i < 7; i++)
            capped = MadCap.Utilities.CapNumber(capped, relevancy2, 0x10, i, 1);

        capped = MadCap.Utilities.CapNumber(capped, relevancy2, 0x10, 7, 1, 0x7);

        return capped;
    }

    MadCap.Utilities.CalculateScore = function (relevancy, importance, relevanceWeight) {
        return (Math.log(relevancy) / Math.log(0x7FFFFFFF) * relevanceWeight) + (importance * (1 - relevanceWeight));
    }

    MadCap.Utilities.CapNumber = function (num1, num2, baseNum, pos, length, max) {
        if (!max)
            max = Math.pow(baseNum, length) - 1;

        // double tilde converts floating point into signed 32-bit integer
        var dividend = Math.pow(baseNum, pos);
        var modulus = dividend * Math.pow(baseNum, length);

        var pos1 = ~~(num1 % modulus / dividend);
        var pos2 = ~~(num2 % modulus / dividend);
        var maxPos = Math.min(pos1 + pos2, max);

        return num1 + ((maxPos - pos1) * dividend);
    }
        
    MadCap.Utilities.Require = function (files, onComplete) {
        if (!MadCap.Utilities._requireCache)
            MadCap.Utilities._requireCache = Object.create(null);

        var cache = MadCap.Utilities._requireCache;
        var file = files[0]; // match require.js call (takes an array)
        var cacheEntry = cache[file];

        if (cacheEntry && cacheEntry.data)
            onComplete(cacheEntry.data);
        else {
            if (cacheEntry && cacheEntry.callbacks)
                cacheEntry.callbacks.push(onComplete);
            else {
                cache[file] = { callbacks: [onComplete] };
                require([file], function (data) {
                    cacheEntry = cache[file];
                    cacheEntry.data = data;

                    for (var i = 0; i < cacheEntry.callbacks.length; i++)
                        cacheEntry.callbacks[i](data);
                    cacheEntry.callbacks = null;

                    require.undef(file);
                });
            }
        }
    }

    MadCap.Utilities.GetChunkId = function (chunkMap, lookupId, compareFunc) {
        for (var i = 0; i < chunkMap.length; i++) {
            var lookupTopic = chunkMap[i];
            var compare = compareFunc(lookupId, lookupTopic);

            if (compare === 0)
                return i;
            else if (compare === -1)
                return i - 1;
        }

        return chunkMap.length - 1;
    }

    MadCap.Utilities.GetChunkIds = function (chunkMap, lookupId, compareFunc) {
        // return the range of chunks potentially containing the lookupId
        var chunkIds = [];
        var exactMatch = false;

        for (var i = 0; i < chunkMap.length; i++) {
            var lookupTopic = chunkMap[i];
            var compare = compareFunc(lookupId, lookupTopic);

            if (compare === -1 && i === 0)
                return chunkIds;

            if (compare === 0) {
                if (i > 0 && !exactMatch)
                    chunkIds.push(i - 1);
                chunkIds.push(i);
                exactMatch = true;
            }
            else if (compare === -1) {
                if (i > 0 && !exactMatch)
                    chunkIds.push(i - 1);
                break;
            }
        }

        if (chunkIds.length === 0)
            chunkIds.push(chunkMap.length - 1);

        return chunkIds;
    }

    MadCap.Utilities.ClearRequireCache = function () {
        MadCap.Utilities._requireCache = null;
    }

    MadCap.Utilities.StopWords = Array("a", "an", "the", "to", "of", "is", "for", "and", "or", "do", "be", "by", "he", "she", "on", "in", "at", "it", "not", "no", "are", "as", "but", "her", "his", "its", "non", "only", "than", "that", "then", "they", "this", "we", "were", "which", "with", "you", "into", "about", "after", "all", "also", "been", "can", "come", /* -V3SR1- "form",*/ "from", "had", "has", "have", "me", "made", "many", "may", "more", "most", "near", "over", "some", "such", "their", "there", "these", "under", "use", "was", "when", "where", "against", "among", "became", "because", "between", "during", "each", "early", "found", "however", "include", "late", "later", "med", "other", "several", "through", "until", "who", "your");

    // localStorage polyfill (IE over file:// reports window.localStorage as 'undefined' yet won't allow it to be written to. So we can't create a polyfill and use a wrapper function instead.)
    MadCap.Utilities.Store = (function () {
        try {
            if (window.localStorage)
                return window.localStorage;
        }
        catch (e) {
            if (console && console.log) {
                console.log("window.localStorage not available");
            }
        }
        var STORAGE_KEY = "MadCap";
        var div = document.createElement("div");
        div.style.display = "none";

        document.getElementsByTagName("head")[0].appendChild(div);

        if (typeof div.addBehavior == 'function') {
            div.addBehavior("#default#userdata");
            div.load(STORAGE_KEY);

            return {
                getItem: function (key) {
                    return div.XMLDocument.documentElement.getAttribute(key);
                },

                setItem: function (key, value) {
                    div.XMLDocument.documentElement.setAttribute(key, value);
                    div.save(STORAGE_KEY);
                },

                removeItem: function (key) {
                    div.removeAttribute(key);
                    div.save(STORAGE_KEY);
                }
            };
        }

        var STORAGE_ATTR_KEY = "data-" + STORAGE_KEY + "-";

        return {
            getItem: function (key) {
                var value = div.getAttribute(STORAGE_ATTR_KEY + key);
                return value ? decodeURIComponent(value) : value;
            },

            setItem: function (key, value) {
                div.setAttribute(STORAGE_ATTR_KEY + key, value ? encodeURIComponent(value) : null);
            },

            removeItem: function (key) {
                div.removeAttribute(STORAGE_ATTR_KEY + key);
            }
        };
    })();
})();

Array.prototype.Remove = function (index) {
    /// <summary>Removes the item at the specified index from the array.</summary>
    /// <param name="index">The index to remove from the array.</param>

    if (index < 0 || index > this.length)
        throw "Index out of bounds.";

    this.splice(index, 1);
};

Array.prototype.RemoveValue = function (value) {
    /// <summary>Removes all items with the specified value from the array.</summary>
    /// <param name="value">The value to remove from the array.</param>

    for (var i = this.length - 1; i >= 0; i--) {
        if (this[i] == value)
            this.Remove(i);
    }
};

Array.prototype.Union = function (other) {
    var arr = [].concat(this);
    if (other) {
        for (var i = 0; i < other.length; i++) {
            if (this.indexOf(other[i]) === -1)
                arr.push(other[i]);
        }
    }
    return arr;
};

Array.prototype.Intersect = function (other) {
    var arr = [];
    for (var i = 0; i < other.length; i++) {
        if (this.indexOf(other[i]) !== -1)
            arr.push(other[i]);
    }
    return arr;
}