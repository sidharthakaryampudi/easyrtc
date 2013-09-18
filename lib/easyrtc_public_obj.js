/** 
 * Public interface for interacting with EasyRTC. Contains the public object returned by the EasyRTC listen() function. 
 *
 * @module      easyrtc_public_obj
 * @author      Priologic Software, info@easyrtc.com
 * @copyright   Copyright 2013 Priologic Software. All rights reserved.
 * @license     BSD v2, see LICENSE file in module root folder. 
 */

var events          = require("events"); 
var async           = require("async");
var _               = require("underscore");                // General utility functions external module
var g               = require("./general_util");            // General utility functions local module

var e               = require("./easyrtc_private_obj");     // EasyRTC private object
var eventFunctions  = require("./easyrtc_event_functions"); // EasyRTC default event functions
var eu              = require("./easyrtc_util");            // EasyRTC utility functions

/**
 * The public object which is returned by the EasyRTC listen() function. Contains all public methods for interacting with EasyRTC server.
 * 
 * @class
 */  
var pub = module.exports;


/**
 * Alias for Socket.io server object. Set during Listen().
 * 
 * @member  {Object}    pub.socketServer
 * @example             <caption>Dump of all Socket.IO clients to server console</caption>
 * console.log(pub.socketServer.connected); 
 */
pub.socketServer = null;


/**
 * Alias for Express app object. Set during Listen()
 *  
 * @member  {Object}    pub.httpApp
 */
pub.httpApp = null;


/**
 * Sends an array of all application names to a callback.
 *
 * @param   {function(Error, Array.<string>)} callback Callback with error and array containing all application names.
 */
pub.getAppNames = function (callback) {
    var appNames = new Array();
    for (var key in e.app) {
        appNames.push(key);
    };
    callback(null, appNames);    
};


/**
 * Gets app object for application which has an authenticated client with a given easyrtcid
 *   
 * @param       {string}    easyrtcid   EasyRTC unique identifier for a socket connection.
 * @param       {function(Error, Object)} callback Callback with error and application object
 */
pub.getAppWithEasyrtcid = function(easyrtcid, callback) {
    for(var key in e.app) {
        if (e.app[key].connection[easyrtcid] && e.app[key].connection[easyrtcid].isAuthenticated) {
            pub.app(key, callback);
            return;
        }
    }
    pub.util.logWarning("Can not find connection ["+ easyrtcid +"]");
    callback(new pub.util.ConnectionWarning("Can not find connection ["+ easyrtcid +"]"));
};


/**
 * Gets connection object for connection which has an authenticated client with a given easyrtcid 
 * 
 * @param       {string}    easyrtcid   EasyRTC unique identifier for a socket connection.
 * @param       {function(Error, Object)} callback Callback with error and connection object
 */
pub.getConnectionWithEasyrtcid = function(easyrtcid, callback) {
    for(var key in e.app) {
        if (e.app[key].connection[easyrtcid] && e.app[key].connection[easyrtcid].isAuthenticated) {
            pub.app(key, function(err,appObj) {
                if (err) {
                    callback(err);
                    return;
                }
                appObj.connection(easyrtcid, callback);
            });
            return;
        }
    }
    pub.util.logWarning("Can not find connection ["+ easyrtcid +"]");
    callback(new pub.util.ConnectionWarning("Can not find connection ["+ easyrtcid +"]"));
};


/**
 * Gets individual option value
 * 
 * @param       {Object}    option      Option name     
 * @return      {string}                Option value (can be any type)
 */
pub.getOption = function(optionName) {
    return e.option[optionName];
};


/**
 * Gets EasyRTC Version
 * 
 * @return      {string}                EasyRTC Version
 */
pub.getVersion = function() {
    return e.version;
};


/**
 * Sets individual option.
 * 
 * @param       {Object}    option      Option name     
 * @param       {Object}    value       Option value
 * @return      {Boolean}               true on success, false on failure
 */
pub.setOption = function(optionName, optionValue) {
    // Can only set options which currently exist
    if (typeof e.option[optionName] == "undefined") {
        pub.util.logError("Error setting option. Unrecognised option name '" + optionName + "'.");
        return false;
     }

    // TODO: Use a case statement to handle specific option types to ensure they are set properly.
    
    e.option[optionName] = pub.util.deepCopy(optionValue);
    return true;
};


/**
 * EasyRTC EventEmmitter
 */
pub.eventHandler = new events.EventEmitter();


/**
 * EasyRTC Event handling object
 * @class
 */
pub.events = {};


/**
 * Resets the listener for a given event to the default listener. Removes other listeners.
 *  
 * @param       {string}    eventName   EasyRTC event name.
 */
pub.events.setDefaultListener = function(eventName) {
    if (!_.isFunction(pub.events.defaultListeners[eventName])) {
        console.log("Error setting default listener. No default for event '" + eventName + "' exists.");
    }
    pub.eventHandler.removeAllListeners(eventName);
    pub.eventHandler.on(eventName, pub.events.defaultListeners[eventName]);
};


/**
 * Resets the listener for all EasyRTC events to the default listeners. Removes all other listeners. 
 */
pub.events.setDefaultListeners = function() {
    pub.eventHandler.removeAllListeners();
    for (var currentEventName in pub.events.defaultListeners) {
        if (_.isFunction(pub.events.defaultListeners[currentEventName])) {
            pub.eventHandler.on(currentEventName, pub.events.defaultListeners[currentEventName]);
        } else {
            throw new pub.util.ServerError("Error setting default listener. No default for event '" + currentEventName + "' exists.");
        }
    }
};


/**
 * Map of EasyRTC event listener names to their default functions. This map can be used to run a default function manually.  
 */
pub.events.defaultListeners = {
    "authenticate":     eventFunctions.onAuthenticate,
    "log" :             eventFunctions.onLog,
    "connection" :      eventFunctions.onConnection,
    "disconnect":       eventFunctions.onDisconnect,
    "easyrtcAuth" :     eventFunctions.onEasyrtcAuth,
    "easyrtcCmd":       eventFunctions.onEasyrtcCmd,
    "easyrtcMsg" :      eventFunctions.onEasyrtcMsg,
    "emitEasyrtcCmd":   eventFunctions.onEmitEasyrtcCmd,
    "emitEasyrtcMsg":   eventFunctions.onEmitEasyrtcMsg,
    "emitError":        eventFunctions.onEmitError,
    "emitReturnError":  eventFunctions.onEmitReturnError,
    "emitReturnAck":    eventFunctions.onEmitReturnAck,
    "getRoomList":      eventFunctions.onGetRoomList,
    "roomJoin":         eventFunctions.onRoomJoin,
    "roomLeave":        eventFunctions.onRoomLeave,
    "setPresence":      eventFunctions.onSetPresence,
    "shutdown":         eventFunctions.onShutdown,
    "startup" :         eventFunctions.onStartup
};


/**
 * Sets listener for a given EasyRTC event. Only one listener is allowed per event. Any other listeners for an event are removed before adding the new one. See the events documentation for expected listener parameters.
 * 
 * @param       {string}    eventName   Listener name.
 * @param       {function}  listener    Function to be called when listener is fired
 */
pub.events.on = function(eventName, listener) {
    if (eventName && _.isFunction(listener)) {
        pub.eventHandler.removeAllListeners(eventName);
        pub.eventHandler.on(eventName, listener);
    }
    else {
        pub.util.logError("Unable to add listener to event '" + eventName + "'");
    }
};


/**
 * Removes all listeners for an event. If there is a default EasyRTC listener, it will be added. If eventName is `null`, all events will be removed than the defaults will be restored.
 * 
 * @param       {?string}   eventName   Listener name. If `null`, then all events will be removed.
 */
pub.events.removeAllListeners = function(eventName) {
    if (eventName) {
        pub.events.setDefaultListener(eventName);
    } else {
        pub.events.setDefaultListeners();
    }
};


/**
 * General utility functions are grouped in this util object.
 * @class  
 */
pub.util = {};

/**
 * Performs a deep copy of an object, returning the duplicate.
 * Do not use on objects with circular references.
 * 
 * @function
 * @param       {Object}    input       Input variable (or object) to be copied.
 * @returns     {Object}                New copy of variable.
 */
pub.util.deepCopy             = g.deepCopy;


/**
 * An empty dummy function, which is designed to be used as a default callback in functions when none has been provided.
 * 
 * @param       {Object}    input       Input variable (or object) to be copied.
 */
pub.util.nextToNowhere  =   function(err) {};

/**
 * Determines if an Error object is an instance of ApplicationError, ConnectionError, or ServerError. If it is, it will return true.
 * 
 * @function
 * @param       {Error}     err     
 * @return      {Boolean}
 */
pub.util.isError              = eu.isError;


/**
 * Determines if an Error object is an instance of ApplicationWarning, ConnectionWarning, or ServerWarning. If it is, it will return true.
 * 
 * @function
 * @param   {Error}         err     
 * @return  {Boolean}
 */
pub.util.isWarning            = eu.isWarning;


/**
 * Custom Error Object for EasyRTC Application Errors.
 * 
 * @function
 * @param   {string}        msg     Text message describing the error. 
 */
pub.util.ApplicationError     = eu.ApplicationError;


/**
 * Custom Error Object for EasyRTC Application Warnings.
 * 
 * @function
 * @param   {string}        msg     Text message describing the error. 
 */
pub.util.ApplicationWarning   = eu.ApplicationWarning;


/**
 * Custom Error Object for EasyRTC C Errors.
 * 
 * @function
 * @param   {string}        msg     Text message describing the error. 
 */
pub.util.ConnectionError      = eu.ConnectionError;

/**
 * Custom Error Object for EasyRTC Connection Warnings.
 * 
 * @function
 * @param   {string}        msg     Text message describing the error. 
 */
pub.util.ConnectionWarning    = eu.ConnectionWarning;


/**
 * Custom Error Object for EasyRTC Server Errors.
 * 
 * @function
 * @param   {string}        msg     Text message describing the error. 
 */
pub.util.ServerError          = eu.ServerError;


/**
 * Custom Error Object for EasyRTC Server Warnings.
 * 
 * @function
 * @param   {string}        msg     Text message describing the error. 
 */
pub.util.ServerWarning        = eu.ServerWarning;


/**
 * Returns an EasyRTC message error object for a specific error code. This is meant to be emited or returned to a websocket client.
 * 
 * @param       {string}    errorCode   Error code to return error message for.
 * @return      {Object}                EasyRTC message error object for the specific error code.
 */
pub.util.getErrorMsg = function(errorCode) {
    var msg = {
        msgType: "error",
        serverTime: Date.now(),
        msgData: {
            errorCode: errorCode,
            errorText: pub.util.getErrorText(errorCode)
        }        
    };

    if (!msg.msgData.errorText) {
        msg.msgData.errorText="Error occurred with error code: " + errorCode;
        pub.util.logWarning("Emitted unknown error with error code [" + errorCode + "]");
    }

    return msg;
};


/**
 * Returns human readable text for a given error code. If an unknown error code is provided, a null value will be returned.
 * 
 * @param       {string}    errorCode   Error code to return error string for.
 * @return      {string}                Human readable error string
 */
pub.util.getErrorText = function(errorCode) {
    switch (errorCode) {
        case "BANNED_IP_ADDR":              return "Client IP address is banned. Socket will be disconnected."; break;
        case "LOGIN_APP_AUTH_FAIL":         return "Authentication for application failed. Socket will be disconnected."; break;
        case "LOGIN_BAD_APP_NAME":          return "Provided application name is improper. Socket will be disconnected."; break;
        case "LOGIN_BAD_AUTH":              return "API Key is invalid or referer address is improper. Socket will be disconnected."; break;
        case "LOGIN_BAD_USER_CFG":          return "Provided configuration options improper or invalid. Socket will be disconnected."; break;
        case "LOGIN_NO_SOCKETS":            return "No sockets available for account. Socket will be disconnected."; break;
        case "LOGIN_TIMEOUT":               return "Login has timed out. Socket will be disconnected."; break;
        case "MSG_REJECT_BAD_DATA":         return "Message rejected. The provided msgData is improper."; break;
        case "MSG_REJECT_BAD_STRUCTURE":    return "Message rejected. The provided structure is improper."; break;
        case "MSG_REJECT_BAD_TYPE":         return "Message rejected. The provided msgType is unsupported."; break;
        case "MSG_REJECT_NO_AUTH":          return "Message rejected. Not logged in or client not authorized."; break;
        case "MSG_REJECT_NO_ROOM_LIST":     return "Message rejected. Room list unavailable."; break;
        case "MSG_REJECT_PRESENCE":         return "Message rejected. Presence could could not be set."; break;
        case "MSG_REJECT_TARGET_EASYRTCID": return "Message rejected. Target easyrtcid is invalid, not using same application, or no longer online."; break;
        case "MSG_REJECT_TARGET_GROUP":     return "Message rejected. Target group is invalid or not defined."; break;
        case "MSG_REJECT_TARGET_ROOM":      return "Message rejected. Target room is invalid or not created."; break;
        case "SERVER_SHUTDOWN":             return "Server is being shutdown. Socket will be disconnected."; break;
        default:
            pub.util.logWarning("Unknown message errorCode requested [" + errorCode + "]");
            return null;
    }
};


/**
 * General logging function which emits a log event so long as the log level has a severity equal or greater than e.option.logLevel
 * 
 * @param       {string}    level       Log severity level. Can be ("debug"|"info"|"warning"|"error")     
 * @param       {string}    logText     Text for log
 * @param       {?*}        [logFields] Simple JSON object which contains extra fields to be logged. 
 */
pub.util.log = function(level, logText, logFields) {
    switch(e.option.logLevel) {
        case "error":
        if (level !="error") {break;}

        case "warning":
        if (level =="info" ) {break;}

        case "info":
        if (level =="debug") {break;}

        case "debug":
        pub.eventHandler.emit("log", level, logText, logFields);
    }
};


/**
 * Convenience function for logging "debug" level items.
 * 
 * @param       {string}    logText     Text for log.
 * @param       {?*}        [logFields] Simple JSON object which contains extra fields to be logged. 
 */
pub.util.logDebug = function(logText, logFields) {
    pub.util.log("debug", logText, logFields);
};


/**
 * Convenience function for logging "info" level items.
 * 
 * @param       {string}    logText     Text for log.
 * @param       {?*}        [logFields] Simple JSON object which contains extra fields to be logged. 
 */
pub.util.logInfo = function(logText, logFields) {
    pub.util.log("info", logText, logFields);
};


/**
 * Convenience function for logging "warning" level items.
 * 
 * @param       {string}    logText     Text for log.
 * @param       {?*}        [logFields] Simple JSON object which contains extra fields to be logged. 
 */
pub.util.logWarning = function(logText, logFields) {
    pub.util.log("warning", logText, logFields);
};


/**
 * Convenience function for logging "error" level items.
 * 
 * @param       {string}    logText     Text for log.
 * @param       {?*}        [logFields] Simple JSON object which contains extra fields to be logged. 
 */
pub.util.logError = function(logText, logFields) {
    pub.util.log("error", logText, logFields);
};



/**
 * Checks an incoming EasyRTC message to determine if it is syntactically valid.
 * 
 * @param       {string}    type        The Socket.IO message type. Expected values are (easyrtcAuth|easyrtcCmd|easyrtcMsg)     
 * @param       {Object}    msg         The full message object to validate
 * @param       {?Object}   appObj      The application object. May be null.
 * @param       {function(Error, {boolean}, {string})} callback Callback with error, a boolean of whether message if valid, and a string indicating the error code if the message is invalid.
 */
pub.isValidIncomingMessage = function(type, msg, appObj, callback) {
    // A generic getOption variable which points to the getOption function at either the top or application level
    var getOption = (_.isObject(appObj) ? appObj.getOption : pub.getOption);

    // All messages follow the basic structure
    if (!_.isString(type)) {
        callback(null, false, "MSG_REJECT_BAD_TYPE");
        return;
    }
    if (!_.isObject(msg)) {
        callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
        return;
    }
    if (!_.isString(msg.msgType)) {
        callback(null, false, "MSG_REJECT_BAD_TYPE");
        return;
    }
    
    switch (type) {
        case "easyrtcAuth":
            if (msg.msgType != "authenticate") {
                callback(null, false, "MSG_REJECT_BAD_TYPE");
                return;
            }
            if (!_.isObject(msg.msgData)) {
                callback(null, false, "MSG_REJECT_BAD_DATA");
                return;
            }
            
            // msgData.apiVersion (required)
            if (msg.msgData.apiVersion === undefined || !_.isString(msg.msgData.apiVersion) ||  !getOption("apiVersionRegExp").test(msg.msgData.apiVersion)) {
                callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                return;
            }
            
            // msgData.appName
            if (msg.msgData.appName !== undefined && (!_.isString(msg.msgData.appName) ||  !getOption("appNameRegExp").test(msg.msgData.appName))) {
                callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                return;
            }

            // TODO: Ensure switch to appObj.getOption (if app exists)

            // msgData.easyrtcsid
            if (msg.msgData.easyrtcsid !== undefined && (!_.isString(msg.msgData.easyrtcsid) ||  !getOption("appNameRegExp").test(msg.msgData.appName))) {
                callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                return;
            }

            // msgData.username
            if (msg.msgData.username !== undefined && (!_.isString(msg.msgData.username) ||  !getOption("usernameRegExp").test(msg.msgData.username))) {
                callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                return;
            }
            
            // msgData.credential
            if (msg.msgData.credential !== undefined && (!_.isObject(msg.msgData.credential) ||  _.isEmpty(msg.msgData.credential))) {
                callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                return;
            }
            
            // msgData.roomJoin
            if (msg.msgData.roomJoin !== undefined) {
                if (!_.isObject(msg.msgData.roomJoin)){
                    callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                    return;
                }
                
                for (var currentRoomName in msg.msgData.roomJoin) {
                    if (!getOption("roomNameRegExp").test(currentRoomName) || !_.isObject(msg.msgData.roomJoin[currentRoomName]) || !_.isString(msg.msgData.roomJoin[currentRoomName].roomName) || currentRoomName != msg.msgData.roomJoin[currentRoomName].roomName) {
                        callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                        return;
                    }
                };
            }

            // msgData.setPresence
            if (msg.msgData.setPresence !== undefined) {
                if (!_.isObject(msg.msgData.setPresence) || _.isEmpty(msg.msgData.setPresence)) {
                    callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                    return;
                }
                if (msg.msgData.setPresence.show !== undefined && (!_.isString(msg.msgData.setPresence.show) || !getOption("presenceShowRegExp").test(msg.msgData.setPresence.show))) {
                    callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                    return;
                }
                if (msg.msgData.setPresence.status !== undefined && (!_.isString(msg.msgData.setPresence.status) || !getOption("presenceStatusRegExp").test(msg.msgData.setPresence.status))) {
                    callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                    return;
                }
            }
            
            // TODO: setUserCfg
            if (msg.msgData.setUserCfg !== undefined) {
            }
            break;

        case "easyrtcCmd":
            switch (msg.msgType) {
                case "candidate" :
                case "offer" :
                case "answer" :
                    // candidate, offer, and answer each require a non-empty msgData object and a proper targetEasyrtcid 
                    if (!_.isObject(msg.msgData) || _.isEmpty(msg.msgData)) {
                        callback(null, false, "MSG_REJECT_BAD_DATA");
                        return;
                    }
                    if (!_.isString(msg.targetEasyrtcid) || !getOption("easyrtcidRegExp").test(msg.targetEasyrtcid)) {
                        callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                        return;
                    }
                    break;
                case "reject" :
                case "hangup" :
                    // reject, and hangup each require a targetEasyrtcid but no msgData 
                    if (msg.msgData !== undefined) {
                        callback(null, false, "MSG_REJECT_BAD_DATA");
                        return;
                    }
                    if (!_.isString(msg.targetEasyrtcid) || !getOption("easyrtcidRegExp").test(msg.targetEasyrtcid)) {
                        callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                        return;
                    }
                    break;

                case "getRoomList" :
                    if (msg.msgData !== undefined) {
                        callback(null, false, "MSG_REJECT_BAD_DATA");
                        return;
                    }
                    break;

                case "roomJoin" :
                    if (!_.isObject(msg.msgData)) {
                        callback(null, false, "MSG_REJECT_BAD_DATA");
                        return;
                    }
                    if (!_.isObject(msg.msgData.roomJoin)){
                        callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                        return;
                    }
                    
                    for (var currentRoomName in msg.msgData.roomJoin) {
                        if (!getOption("roomNameRegExp").test(currentRoomName) || !_.isObject(msg.msgData.roomJoin[currentRoomName]) || !_.isString(msg.msgData.roomJoin[currentRoomName].roomName) || currentRoomName != msg.msgData.roomJoin[currentRoomName].roomName) {
                            callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                            return;
                        }
                    };
                    break;

                case "roomLeave" :
                    if (!_.isObject(msg.msgData)) {
                        callback(null, false, "MSG_REJECT_BAD_DATA");
                        return;
                    }
                    if (!_.isObject(msg.msgData.roomLeave)){
                        callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                        return;
                    }
                    
                    for (var currentRoomName in msg.msgData.roomLeave) {
                        if (!getOption("roomNameRegExp").test(currentRoomName) || !_.isObject(msg.msgData.roomLeave[currentRoomName]) || !_.isString(msg.msgData.roomLeave[currentRoomName].roomName) || currentRoomName != msg.msgData.roomLeave[currentRoomName].roomName) {
                            callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                            return;
                        }
                    };
                    break;

                case "setPresence" :
                    if (!_.isObject(msg.msgData)) {
                        callback(null, false, "MSG_REJECT_BAD_DATA");
                        return;
                    }
                    if (!_.isObject(msg.msgData.setPresence) || _.isEmpty(msg.msgData.setPresence)) {
                        callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                        return;
                    }
                    if (msg.msgData.setPresence.show !== undefined && (!_.isString(msg.msgData.setPresence.show) || !getOption("presenceShowRegExp").test(msg.msgData.setPresence.show))) {
                        callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                        return;
                    }
                    if (msg.msgData.setPresence.status !== undefined && (!_.isString(msg.msgData.setPresence.status) || !getOption("presenceStatusRegExp").test(msg.msgData.setPresence.status))) {
                        callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                        return;
                    }
                    break;

                case "setUserCfg" :
                    if (!_.isObject(msg.msgData)) {
                        callback(null, false, "MSG_REJECT_BAD_DATA");
                        return;
                    }
                    if (!_.isObject(msg.msgData.setUserCfg) || _.isEmpty(msg.msgData.setUserCfg)) {
                        callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                        return;
                    }

                    // setUserCfg.p2pList
                    if (msg.msgData.setUserCfg.p2pList !== undefined && (!_.isObject(msg.msgData.setUserCfg.p2pList) || _.isEmpty(msg.msgData.setUserCfg.p2pList))) {
                        callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                        return;
                    }
                    // TODO: Go through p2pList to confirm key's are easyrtcid's

                    // setUserCfg.userSettings
                    if (msg.msgData.setUserCfg.userSettings !== undefined && (!_.isObject(msg.msgData.setUserCfg.userSettings) || _.isEmpty(msg.msgData.setUserCfg.userSettings))) {
                        callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                        return;
                    }
                    
                    // setUserCfg.apiField
                    if (msg.msgData.setUserCfg.apiField !== undefined && (!_.isObject(msg.msgData.setUserCfg.apiField) || _.isEmpty(msg.msgData.setUserCfg.apiField))) {
                        callback(null, false, "MSG_REJECT_BAD_STRUCTURE");
                        return;
                    }
                    
                    break;

                default:
                    // Reject all unknown msgType's
                    callback(null, false, "MSG_REJECT_BAD_TYPE");
                    return;
            }
        
            break;

        case "easyrtcMsg":
            // targetEasyrtcid
            if (msg.targetEasyrtcid !== undefined && (!_.isString(msg.targetEasyrtcid) || !getOption("easyrtcidRegExp").test(msg.targetEasyrtcid))) {
                callback(null, false, "MSG_REJECT_TARGET_EASYRTCID");
                return;
            }
            // targetGroup
            if (msg.targetGroup !== undefined && (!_.isString(msg.targetGroup) || !getOption("groupNameRegExp").test(msg.targetGroup))) {
                callback(null, false, "MSG_REJECT_TARGET_GROUP");
                return;
            }
            // targetRoom
            if (msg.targetRoom !== undefined && (!_.isString(msg.targetRoom) || !getOption("roomNameRegExp").test(msg.targetRoom))) {
                callback(null, false, "MSG_REJECT_TARGET_ROOM");
                return;
            }
            break;

        default:
            callback(null, false, "MSG_REJECT_BAD_TYPE");
            return;
    }

    callback(null, true, null);
};



/**
 * Determine if a given application name has been defined.
 * 
 * @param       {string}    appName     Application name.
 * @param       {function(Error, {boolean})} callback Callback with error and boolean of whether application is defined.
 */
pub.isApp = function (appName, callback) {
    callback(null, (e.app[appName]?true:false));
};


/**
 * Creates a new EasyRTC application with default values. If a callback is provided, it will receive the new application object.
 * 
 * The callback may receive an Error object if unsuccessful. Depending on the severity, known errors have an "instanceof" ApplicationWarning or ApplicationError.
 * 
 * @param       {string}    appName     Application name.
 * @param       {appCallback} [callback] Callback with error and application object
 */
pub.createApp = function(appName, callback) {
    if (!_.isFunction(callback)) {
        callback = function(err, appObj) {};
    }
    if (!appName || !pub.getOption("appNameRegExp").test(appName)) {
        pub.util.logWarning("Can not create application with improper name: '" + appName +"'");
        callback(new pub.util.ApplicationWarning("Can not create application with improper name: '" + appName +"'"));
        return;
    }
    if (e.app[appName]) {
        pub.util.logWarning("Can not create application which already exists: '" + appName +"'");
        callback(new pub.util.ApplicationWarning("Can not create application which already exists: '" + appName +"'"));
        return;
    }

    pub.util.logDebug("Creating application: '" + appName +"'");

    e.app[appName] = {
        appName:    appName,
        connection: {},
        field:      {},
        group:      {},
        option:     {},
        listStack:  [], // MAY REMOVE
        room:       {},
        session:    {}
    };

    // Get the new app object
    pub.app(appName, function(err, appObj) {
        if (err){
            callback(err);
            return;
        }
        // Create default room
        appObj.createRoom( pub.getOption("roomDefaultName"),
            function(err, roomObj) {
                if (err){
                    callback(err);
                    return;
                }
                // Return app object to callback
                callback(null, appObj);
            }
        );
    });
};


/**
 * Contains the methods for interfacing with an EasyRTC application.
 * 
 * The callback will receive an application object upon successful retrieval of application.
 * 
 * The callback may receive an Error object if unsuccessful. Depending on the severity, known errors have an "instanceof" ApplicationWarning or ApplicationError.
 * 
 * The function does return an application object which is useful for chaining, however the callback approach is safer and provides additional information in the event of an error.
 * 
 * @param       {?string}   appName     Application name. Uses default application if null.
 * @param       {appCallback} [callback]  Callback with error and application object
 */
pub.app = function(appName, callback) {

    /**
     * The primary method for interfacing with an EasyRTC application. 
     *
     * @class       appObj
     * @memberof    pub
     */
    var appObj = {};
    if (!appName) {
        appName = pub.getOption("appDefaultName");
    }
    if (!_.isFunction(callback)) {
        callback = function(err, appObj) {};
    }
    if (!e.app[appName]) {
        pub.util.logWarning("Attempt to request non-existant application name: '" + appName +"'");
        callback(new pub.util.ApplicationWarning("Attempt to request non-existant application name: '" + appName +"'"));
        return;
    }

    /**
     * Returns the application name.  
     *
     * @memberof    pub.appObj
     * @return      {string}    The application name.
     */
    appObj.getAppName = function() {
        return appName;
    };


    /**
     * Returns an array of all easyrtcid's connected to the application
     * 
     * @memberof    pub.appObj
     * @param       {function(Error, Array.<string>)} callback Callback with error and array of easyrtcid's.
     */
    appObj.getConnectionEasyrtcids = function(callback) {
        var easyrtcids = new Array();
        for (var key in e.app[appName].connection) {
            easyrtcids.push(key);
        };
        callback(null, easyrtcids);    
    };


    /**
     * NOT YET IMPLEMENTED - Returns application field value for a given field name.
     *  
     * @ignore
     * @memberof    pub.appObj
     * @param       {string}    Field name
     * @param       {function(Error, Object)} callback Callback with error and field value (any type)
     */
    appObj.getField = function(fieldName, callback) {
        if (!e.app[appName].field[fieldName]) {
            pub.util.logDebug("Can not find app field: '" + fieldName +"'");
            callback(new pub.util.ApplicationWarning("Can not find app field: '" + fieldName +"'"));
            return;
        }
        callback(null, e.app[appName].field[fieldName].data);    
    };


    /**
     * NOT YET IMPLEMENTED - Returns an array of all field names within the application.
     *
     * @ignore
     * @memberof    pub.appObj
     * @param       {function(Error, Array.<string>)} callback Callback with error and array containing all field names.
     */
    appObj.getFieldNames = function(callback) {
        var fieldNames = new Array();
        for (var key in e.app[appName].field) {
            fieldNames.push(key);
        };
        callback(null, fieldNames);    
    };


    /**
     * Returns an array of all group names within the application
     * 
     * @memberof    pub.appObj
     * @param       {function(Error, Array.<string>)} callback Callback with error and array of group names.
     */
    appObj.getGroupNames = function(callback) {
        var groupNames = new Array();
        for (var key in e.app[appName].group) {
            groupNames.push(key);
        };
        callback(null, groupNames);
    };


    /**
     * Gets individual option value. Will first check if option is defined for the application, else it will revert to the global level option.
     * 
     * @memberof    pub.appObj
     * @param       {Object}    option      Option name     
     * @return      {string}                Option value (can be any type)
     */
    appObj.getOption = function(optionName) {
        return ((e.app[appName].option[optionName] === undefined) ? pub.getOption(optionName) : (e.app[appName].option[optionName])); 
    };


    /**
     * Returns an array of all room names within the application.
     * 
     * @memberof    pub.appObj
     * @param       {function(Error, Array.<string>)} callback Callback with error and array of room names.
     */
    appObj.getRoomNames = function(callback) {
        var roomNames = new Array();
        for (var key in e.app[appName].room) {
            roomNames.push(key);
        };
        callback(null, roomNames);
    };


    /**
     * Returns an array of all session keys within the application
     * 
     * @memberof    pub.appObj
     * @param       {function(Error, Array.<string>)} callback Callback with error and array containing session keys.
     */
    appObj.getSessionKeys = function(callback) {
        var sessionKeys = new Array();
        for (var key in e.app[appName].session) {
            sessionKeys.push(key);
        };
        callback(null, sessionKeys);    
    };


    /**
     * NOT YET IMPLEMENTED - Sets application field value for a given field name.
     *  
     * @ignore
     * @memberof    pub.appObj
     * @param       {string}    fieldName       Must be formatted according to "fieldNameRegExp" option.
     * @param       {Object}    fieldValue
     * @param       {Object}    fieldOptions    Field options (to be implemented in future. Options for sharing fields to the API with possible group restrictions)
     * @param       {nextCallback} [next]         A success callback of form next(err). Possible err will be instanceof (ApplicationWarning). 
     */
    appObj.setField = function(fieldName, fieldValue, fieldOptions, next) {
        if (!_.isFunction(next)) {
            next = pub.util.nextToNowhere;
        }

        if (!pub.getOption("fieldNameRegExp").test(fieldName)) {
            pub.util.logWarning("Can not create application field with improper name: '" + fieldName +"'");
            next(new pub.util.ApplicationWarning("Can not create application field with improper name: '" + fieldName +"'"));
            return;
        }
        e.app[appName].field[fieldName] = {data:fieldValue};
        next(null);
    };


    /**
     * Sets individual option. Set value to NULL to delete the option (thus reverting to global option)
     * 
     * @memberof    pub.appObj
     * @param       {Object}    optionName  Option name
     * @param       {?*}        optionValue Option value
     * @return      {Boolean}               true on success, false on failure
     */
    appObj.setOption = function(optionName, optionValue) {
        // Can only set options which currently exist
        if (typeof e.option[optionName] == "undefined") {
            pub.util.logError("Error setting option. Unrecognised option name '" + optionName + "'.");
            return false;
         }
    
        // If value is null, delete option from application (reverts to global option)
        if (optionValue == null) {
            if (!(e.app[appName].option[optionName] === 'undefined')) {
                delete e.app[appName].option[optionName];
            }
        } else {
            // Set the option value to be a full deep copy, thus preserving private nature of the private EasyRTC object.
            e.app[appName].option[optionName] = pub.util.deepCopy(optionValue);
        }
        return true;
    };


    /**
     * Gets connection object for a given connection key. Returns null if connection not found.
     * The returned connection object includes functions for managing connection fields. 
     *
     * @memberof    pub.appObj
     * @param       {string}    easyrtcid   EasyRTC unique identifier for a socket connection.
     * @param       {connectionCallback} callback Callback with error and object containing EasyRTC connection object.
     */
    appObj.connection = function(easyrtcid, callback) {
        if (!e.app[appName].connection[easyrtcid]) {
            pub.util.logWarning("Attempt to request non-existant connection key: '" + easyrtcid +"'");
            callback(new pub.util.ConnectionWarning("Attempt to request non-existant connection key: '" + easyrtcid +"'"));
            return;
        }
        if (!pub.socketServer || !pub.socketServer.sockets.sockets[easyrtcid] || pub.socketServer.sockets.sockets[easyrtcid].disconnected) {
            pub.util.logWarning("Attempt to request non-existant socket: '" + easyrtcid +"'");
            callback(new pub.util.ConnectionWarning("Attempt to request non-existant socket: '" + easyrtcid +"'"));
            return;
        }
        if (pub.socketServer.sockets.sockets[easyrtcid].disconnected) {
            pub.util.logWarning("Attempt to request disconnected socket: '" + easyrtcid +"'");
            callback(new pub.util.ConnectionWarning("Attempt to request disconnected socket: '" + easyrtcid +"'"));
            return;
        }

        
        /**
         * @class       connectionObj
         * @memberof    pub.appObj
         */
        var connectionObj = {};

        /*
         * Reference to connection's socket.io object.
         * 
         * @memberof    pub.appObj.connectionObj
         */
        connectionObj.socket = pub.socketServer.sockets.sockets[easyrtcid];

        /**
         * Returns the application object to which the connection belongs. Note that unlike most EasyRTC functions, this returns a value and does not use a callback. 
         * 
         * @memberof    pub.appObj.connectionObj
         * @return      {Object}    The application object
         */
        connectionObj.getApp = function() {
            return appObj;
        };


        /**
         * Returns the easyrtcid for the connection.  Note that unlike most EasyRTC functions, this returns a value and does not use a callback.
         *  
         * @memberof    pub.appObj.connectionObj
         * @return      {string}    Returns the connection's easyrtcid, which is the EasyRTC unique identifier for a socket connection.
         */
        connectionObj.getEasyrtcid = function() {
            return easyrtcid;
        };
        

        /**
         * NOT YET IMPLEMENTED - Returns connection field value for a given field name.
         * 
         * @ignore
         * @memberof    pub.appObj.connectionObj
         * @param       {string}    Field name
         * @param       {function(Error, Object)} callback Callback with error and field value (any type)
         */
        connectionObj.getField = function(fieldName, callback) {
            
            if (!_.isUndefined(e.app[appName].connection[easyrtcid].field[fieldName])) {
                callback(null, e.app[appName].connection[easyrtcid].field[fieldName].data);
            }
            else if (!_.isUndefined(e.app[appName].field[fieldName])) {
                callback(null, e.app[appName].field[fieldName].data);
            }
            else {
                pub.util.logDebug("Can not find connection field: '" + fieldName +"'");
                callback(new pub.util.ConnectionWarning("Can not find connection field: '" + fieldName +"'"));
            }
        };


        /**
         * NOT YET IMPLEMENTED - Returns an array of all field names within the connection.
         *
         * @ignore
         * @memberof    pub.appObj.connectionObj
         * @param       {function(Error, Array.<string>)} callback Callback with error and array containing all field names.
         */
        connectionObj.getFieldNames = function(callback) {
            var fieldNames = new Array();
            for (var key in e.app[appName].connection[easyrtcid].field) {
                fieldNames.push(key);
            };
            callback(null, fieldNames);  
        };


        /**
         * Returns an array of all room names which connection has entered.
         *
         * @memberof    pub.appObj.connectionObj
         * @param       {function(Error, Array.<string>)} callback Callback with error and array of room names.
         */
        connectionObj.getRoomNames = function(callback) {
            var roomNames = new Array();
            for (var key in e.app[appName].connection[easyrtcid].room) {
                roomNames.push(key);
            };
            callback(null, roomNames);    
        };


        /**
         * Sets connection authentication status for the connection.
         *  
         * @memberof    pub.appObj.connectionObj
         * @param       {Boolean}   isAuthenticated True/false as to if the connection should be considered authenticated.
         * @param       {nextCallback} next         A success callback of form next(err). 
         */
        connectionObj.setAuthenticated = function(isAuthenticated, next) {
            if (isAuthenticated == true) {
                e.app[appName].connection[easyrtcid].isAuthenticated = true;
            } else {
                e.app[appName].connection[easyrtcid].isAuthenticated = false;
            }
            next(null);
        };


        /**
         * Sets the credential for the connection.
         * 
         * @memberof    pub.appObj.connectionObj
         * @param       {?*}        credential      The credential for the connection. Can be any JSONable object.
         * @param       {nextCallback} next         A success callback of form next(err). 
         */
        connectionObj.setCredential = function(credential, next) {
            e.app[appName].connection[easyrtcid].credential = credential;
            next(null);
        };


        /**
         * NOT YET IMPLEMENTED - Sets connection field value for a given field name. Returns false if field could not be set.
         *  
         * @ignore
         * @memberof    pub.appObj.connectionObj
         * @param       {string}    fieldName       Must be formatted according to "fieldNameRegExp" option.
         * @param       {*}         fieldValue      Value to assign the field. May be any JSONable object including a string or integer.      
         * @param       {Object}    fieldOptions    Field options (to be implemented in future. Options for sharing fields to the API with possible group restrictions)
         * @param       {nextCallback} next         A success callback of form next(err). Possible err will be instanceof (ConnectionWarning). 
         */
        connectionObj.setField = function(fieldName, fieldValue, fieldOptions, next) {
            if (!_.isFunction(next)) {
                next = pub.util.nextToNowhere;
            }
            
            if (!pub.getOption("fieldNameRegExp").test(fieldName)) {
                pub.util.logWarning("Can not create connection field with improper name: '" + fieldName +"'");
                next(new pub.util.ConnectionWarning("Can not create connection field with improper name: '" + fieldName +"'"));
                return;
            }
            e.app[appName].connection[easyrtcid].field[fieldName] = {data:fieldValue};

            next(null);
        };
        
        
        /**
         * Sets the presence object for the connection.
         * 
         * @memberof    pub.appObj.connectionObj
         * @param       {Object}    presenceObj     A presence object.
         * @param       {nextCallback} next         A success callback of form next(err). 
         */
        connectionObj.setPresence = function(presenceObj, next) {
            // TODO: Add better error handling
            if (presenceObj.show) {
                e.app[appName].connection[easyrtcid].presence.show = presenceObj.show;
            }
            if (presenceObj.status) {
                e.app[appName].connection[easyrtcid].presence.status = presenceObj.status;
            }
            if (presenceObj.type) {
                e.app[appName].connection[easyrtcid].presence.type = presenceObj.type;
            }
            next(null);
        };


        /**
         * Sets the username string for the connection.
         *  
         * @memberof    pub.appObj.connectionObj
         * @param       {?string}   username        The username to assign to the connection.
         * @param       {nextCallback}  next        A success callback of form next(err). 
         */
        connectionObj.setUsername = function(username, next) {
            e.app[appName].connection[easyrtcid].username = username;
            next(null);
        };


        /**
         * Emits the roomData message with a clientListDelta for the current connection to other connections in rooms this connection is in.
         * Note: To send listDetas for individual rooms, use connectionRoomObj.emitRoomDataDelta 
         * 
         * @memberof    pub.appObj.connectionObj
         * @param       {Boolean}   isLeavingAllRooms   Indicator if connection is leaving all rooms. Meant to be used upon disconnection / logoff.
         * @param       {Object}    callback        Callback of form (err, roomDataObj) which will contain the roomDataObj including all updated rooms of the connection and is designed to be returnable to the connection.
         */
        connectionObj.emitRoomDataDelta = function(isLeavingAllRooms, callback) {
            pub.util.logDebug("[" + easyrtcid + "] Running func 'connectionObj.emitRoomDataDelta'");
            if (!_.isFunction(callback)) {
                callback = function(err, roomDataObj) {};
            }


            var fullRoomDataDelta = {};
            
            var otherClients = {};
            

            // Generate a complete roomDelta for the current client
            connectionObj.generateRoomDataDelta(isLeavingAllRooms, function(err, newFullRoomDataDelta){
                fullRoomDataDelta = newFullRoomDataDelta;

                // Running callback right away so client doesn't have to wait to continue
                callback(null, fullRoomDataDelta);
                
                // Populate otherClients object with other clients who share room(s)
                for (var currentRoomName in fullRoomDataDelta) {
                    for (var currentEasyrtcid in e.app[appName].room[currentRoomName].clientList) {
                        if (otherClients[currentEasyrtcid] === undefined) {
                            otherClients[currentEasyrtcid] = {};
                        }
                        otherClients[currentEasyrtcid][currentRoomName] = true;
                    }
                }
                
                // Emit custom roomData object to each client who shares a room with the current client
                for (var currentEasyrtcid in otherClients) {
                    var msg = {
                        "msgData":{
                            "roomData":{}
                        }
                    };
                    
                    for (var currentRoomName in otherClients[currentEasyrtcid]) {
                        if (fullRoomDataDelta[currentRoomName]) {
                            msg.msgData.roomData[currentRoomName] = fullRoomDataDelta[currentRoomName]; 
                        }
                    }
                    
                    connectionObj.getApp().connection(currentEasyrtcid, function(err, emitToConnectionObj){
                        if (!err && currentEasyrtcid != easyrtcid && emitToConnectionObj) {
                            pub.eventHandler.emit("emitEasyrtcCmd", emitToConnectionObj, "roomData", msg, null, function(){});
                        }
                    });
                }
            });
        };


        /**
         * Generates a full room clientList object for the given connection
         *  
         * @memberof    pub.appObj.connectionObj
         * @param       {?string}   [roomStatus="join"] Room status which allow for values of "join"|"update"|"leave".
         * @param       {?Object}   roomMap     Map of rooms to generate connection clientList for. If null, then all rooms will be used.
         * @param       {Object}    callback    Callback which includes a formed roomData object .
         */
        connectionObj.generateRoomClientList = function(roomStatus, roomMap, callback) {
            if (!_.isString(roomStatus)) {
                roomStatus = "join";
            }
            
            if (!_.isObject(roomMap)) {
                roomMap = e.app[appName].connection[easyrtcid].room;
            }

            var roomData = {};

            for (var currentRoomName in e.app[appName].connection[easyrtcid].room) {
                // If room is not in the provided roomMap, then skip it.
                if (!roomMap[currentRoomName]) {
                    continue;
                }

                var connectionRoom = e.app[appName].connection[easyrtcid].room[currentRoomName];
                roomData[currentRoomName] = {
                    roomName: currentRoomName,
                    roomStatus:roomStatus,
                    clientList:{}
                };

                // Empty current clientList
                connectionRoom.clientList = {};

                // Fill connection clientList, and roomData clientList for current room
                for (var currentEasyrtcid in connectionRoom.toRoom.clientList) {
                    connectionRoom.clientList[currentEasyrtcid] = {
                        toConnection:connectionRoom.toRoom.clientList[currentEasyrtcid].toConnection
                    };

                    roomData[currentRoomName].clientList[currentEasyrtcid] = {
                        easyrtcid:      currentEasyrtcid,
                        roomJoinTime:   connectionRoom.toRoom.clientList[currentEasyrtcid].toConnection.room[currentRoomName].enteredOn,
                        presence:       connectionRoom.toRoom.clientList[currentEasyrtcid].toConnection.presence
                    };
                    if(!_.isEmpty(connectionRoom.toRoom.clientList[currentEasyrtcid].toConnection.apiField)) {
                        roomData[currentRoomName].clientList[currentEasyrtcid].apiField= connectionRoom.toRoom.clientList[currentEasyrtcid].toConnection.apiField;
                    }
                    if(connectionRoom.toRoom.clientList[currentEasyrtcid].toConnection.username) {
                        roomData[currentRoomName].clientList[currentEasyrtcid].username= connectionRoom.toRoom.clientList[currentEasyrtcid].toConnection.username;
                    }
                    // TODO: Add additional fields
                }
                
                // Updating timestamp of when clientList was retrieved. Useful for sending delta's later on.
                connectionRoom.gotListOn = Date.now();
            };
            callback(null, roomData);
        };


        /**
         * Generates a delta roomData object for the current user including all rooms the user is in. The result can be selectively parsed to deliver delta roomData objects to other clients.
         *   
         * @memberof    pub.appObj.connectionObj
         * @param       {Boolean}   isLeavingRoom   Indicates if connection is in the process of leaving the room.
         * @param       {Object}    callback        Callback of form (err, roomDataDelta).
         */
        connectionObj.generateRoomDataDelta = function(isLeavingRoom, callback) {
            pub.util.logDebug("[" + easyrtcid + "] Running func 'connectionObj.generateRoomDataDelta'");

            var roomDataDelta = {};

            // set the roomData's clientListDelta for each room the client is in
            for (var currentRoomName in e.app[appName].connection[easyrtcid].room) {
                roomDataDelta[currentRoomName] = {
                    "roomName":         currentRoomName,
                    "roomStatus":       "update",
                    "clientListDelta":  {}
                };

                if (isLeavingRoom) {
                    roomDataDelta[currentRoomName].clientListDelta.removeClient = {};
                    roomDataDelta[currentRoomName].clientListDelta.removeClient[easyrtcid] = {"easyrtcid":easyrtcid};
                } else {
                    roomDataDelta[currentRoomName].clientListDelta.updateClient = {};
                    roomDataDelta[currentRoomName].clientListDelta.updateClient[easyrtcid] = {
                        "easyrtcid":    easyrtcid,
                        "roomJoinTime": e.app[appName].connection[easyrtcid].room[currentRoomName].enteredOn,
                        "presence":     e.app[appName].connection[easyrtcid].presence
                    };

                    if(!_.isEmpty(e.app[appName].connection[easyrtcid].apiField)) {
                       roomDataDelta[currentRoomName].clientListDelta.updateClient[easyrtcid].apiField= e.app[appName].connection[easyrtcid].apiField;
                    }
                    if(e.app[appName].connection[easyrtcid].username) {
                        roomDataDelta[currentRoomName].clientListDelta.updateClient[easyrtcid].username= e.app[appName].connection[easyrtcid].username;
                    }
                    // TODO: Add additional fields
                }
            }

            callback(null, roomDataDelta);
        };


        /**
         * Generates the roomList message object
         *  
         * @memberof    pub.appObj.connectionObj
         * @param       {function(Error, Object)} callback Callback with error and roomList object.
         */
        connectionObj.generateRoomList = function(callback) {
            pub.util.logDebug("[" + easyrtcid + "] Running func 'connectionObj.generateRoomList'");
            var roomList = {};

            for (var currentRoomName in e.app[appName].room) {
                roomList[currentRoomName] = {
                    "roomName":currentRoomName,
                    "numberClients": _.size(e.app[appName].room[currentRoomName].clientList)
                };
            };
            callback(null, roomList);
        };


        /**
         * Gets connection authentication status for the connection.
         *  
         * @memberof    pub.appObj.connectionObj
         * @param       {function(Error, Boolean)} callback Callback with error and authentication status.
         */
        connectionObj.isAuthenticated = function(isAuthenticated, callback) {
            if (e.app[appName].connection[easyrtcid].isAuthenticated == true) {
                callback(null,true);
            } else {
                callback(null,false);
            }
        };


        /**
         * Returns a boolean to the callback indicating if connection is in a given room
         *
         * @memberof    pub.appObj.connectionObj
         * @param       {string}    groupName Group name to check.
         * @param       {function(Error, Boolean)} callback Callback with error and a boolean indicating if connection is in a room..
         */
        connectionObj.isInGroup = function(groupName, callback) {
            if (_.isString(groupName) && e.app[appName].connection[easyrtcid].group[groupName] !== undefined) {
                callback(null, true);
            }
            else {
                callback(null, false);
            }
        };


        /**
         * Returns a boolean to the callback indicating if connection is in a given room
         *
         * @memberof    pub.appObj.connectionObj
         * @param       {string}    roomName Room name to check.
         * @param       {function(Error, Boolean)} callback Callback with error and a boolean indicating if connection is in a room..
         */
        connectionObj.isInRoom = function(roomName, callback) {
            if (_.isString(roomName) && e.app[appName].connection[easyrtcid].room[roomName] !== undefined) {
                callback(null, true);
            }
            else {
                callback(null, false);
            }
        };


        /**
         * Joins an existing room, returning a room object. Returns null if room can not be joined.
         *
         * @memberof    pub.appObj.connectionObj
         * @param       {string}    Room name
         * @param       {function(Error, Object)} callback Callback with error and object containing EasyRTC connection room object (same as calling room(roomName))
         */
        connectionObj.joinRoom = function(roomName, callback) {
            if (!roomName || !pub.getOption("roomNameRegExp").test(roomName)) {
                pub.util.logWarning("[" + easyrtcid + "] Can not enter room with improper name: '" + roomName +"'");
                callback(new pub.util.ConnectionWarning("Can not enter room with improper name: '" + roomName +"'"));
                return;
            }
            
            // Check if client already in room
            if (e.app[appName].connection[easyrtcid].room[roomName]) {
                connectionObj.room(roomName, callback);
                return;
            }


            // Local private function to create the default connection-room object in the private variable
            var createConnectionRoom = function(roomName, appRoomObj, callback) {
                // Join room. Creates a default connection room object 
                e.app[appName].connection[easyrtcid].room[roomName] = {
                    apiDefinedFields:   {},
                    enteredOn:          Date.now(),
                    gotListOn:          Date.now(),
                    clientList:         {},
                    userfields:         {},
                    toRoom:             e.app[appName].room[roomName]
                };
                
                // Add easyrtcid to room clientList
                e.app[appName].room[roomName].clientList[easyrtcid] = {
                    enteredOn:      Date.now(),
                    modifiedOn:     Date.now(),
                    toConnection:   e.app[appName].connection[easyrtcid]
                };

                // Returns connection room object to callback. 
                connectionObj.room(roomName, callback);
            };
            
            // Check if room doesn't exist
            if (!e.app[appName].room[roomName]) {
                if (pub.getOption("roomAutoCreateEnable")) {
                        appObj.createRoom(roomName, function(err, roomObj){
                            if (err) {
                                callback(err);
                                return;
                            }
                            createConnectionRoom(roomName, appRoomObj, callback);
                        });
                } else {
                    pub.util.logWarning("[" + easyrtcid + "] Can not enter room which doesn't exist: '" + roomName +"'");
                    callback(new pub.util.ConnectionWarning("Can not enter room which doesn't exist: '" + roomName +"'"));
                    return;
                }
            }

            appObj.room(roomName, function(err, appRoomObj){
                if(err) {
                    callback(err);
                    return;
                }
                createConnectionRoom(roomName, appRoomObj, callback);                
            });
            
        };


        /**
         * Gets room object for a given room name. Returns null if room not found.
         * The returned room object includes functions for managing room fields. 
         *
         * @memberof    pub.appObj.connectionObj
         * @param       {string} Room name
         * @param       {function(Error, Object)} callback Callback with error and object containing EasyRTC connection room object.
         */
        connectionObj.room = function(roomName, callback) {
            if (_.isUndefined(e.app[appName].connection[easyrtcid].room[roomName])) {
                pub.util.logWarning("Attempt to request non-existant room name: '" + roomName +"'");
                callback(new pub.util.ConnectionWarning("Attempt to request non-existant room name: '" + roomName +"'"));
                return;
            }

            /**
             * The primary method for interfacing with an EasyRTC application. 
             *
             * @class       connectionRoomObj
             * @memberof    pub.appObj.connectionObj
             */
            var connectionRoomObj = {};


            /**
             * Leaves the current room. Any room variables will be lost.
             *
             * @memberof    pub.appObj.connectionObj.connectionRoomObj
             * @param       {nextCallback} [next]   A success callback of form next(err). 
             */
            connectionRoomObj.leaveRoom = function(next) {
                if (!_.isFunction(next)) {
                    next = pub.util.nextToNowhere;
                }

                e.app[appName].room[roomName].modifiedOn = Date.now();
                delete e.app[appName].room[roomName].clientList[easyrtcid];
                delete e.app[appName].connection[easyrtcid].room[roomName];

                connectionRoomObj.emitRoomDataDelta(true, function(err, roomDataObj){
                    next(err);
                });
            };


            /**
             * Emits the roomData message with a clientListDelta for the current connection to other connections in the same room.
             * 
             * @memberof    pub.appObj.connectionObj.connectionRoomObj
             * @param       {boolean}   isLeavingRoom   Is connection leaving the room?
             */
            connectionRoomObj.emitRoomDataDelta = function(isLeavingRoom, callback) {
                pub.util.logDebug("[" + easyrtcid + "][" + roomName + "] Running func 'connectionRoomObj.emitRoomDataDelta'");
                if (!_.isFunction(callback)) {
                    callback = function(err, roomDataObj) {};
                }
                
                connectionRoomObj.generateRoomDataDelta(isLeavingRoom, function(err, roomDataDelta) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    
                    var msg = {"msgData":{"roomData": {}}};
                    msg.msgData.roomData[roomName] = roomDataDelta;
                    
                    for (var currentEasyrtcid in e.app[appName].room[roomName].clientList) {
                        connectionObj.getApp().connection(currentEasyrtcid, function(err, emitToConnectionObj){
                            if (!err && currentEasyrtcid != easyrtcid && emitToConnectionObj) {
                                pub.eventHandler.emit("emitEasyrtcCmd", emitToConnectionObj, "roomData", msg, null, function(){});
                            }
                        });
                    }
                    callback(null, roomDataDelta);
                });
            };


            /**
             * Generated the roomData[room] message with a clientListDelta for the current connection to other connections in the same room.
             * 
             * @memberof    pub.appObj.connectionObj.connectionRoomObj
             * @param       {boolean}   isLeavingRoom   Is connection leaving the room?
             */
            connectionRoomObj.generateRoomDataDelta = function(isLeavingRoom, callback) {
                pub.util.logDebug("[" + easyrtcid + "][" + roomName + "] Running func 'connectionRoomObj.generateRoomDataDelta'");
                if (!_.isFunction(callback)) {
                    next = pub.util.nextToNowhere;
                }
                var roomDataDelta = {"roomName":roomName, "roomStatus":"update", "clientListDelta":{}};

                if (isLeavingRoom) {
                    roomDataDelta.clientListDelta.removeClient = {};
                    roomDataDelta.clientListDelta.removeClient[easyrtcid] = {"easyrtcid":easyrtcid};
                } else {
                    var connectionRoom = e.app[appName].connection[easyrtcid].room[roomName];
                    roomDataDelta.clientListDelta.updateClient = {};
                    roomDataDelta.clientListDelta.updateClient[easyrtcid] = {
                        "easyrtcid":      easyrtcid,
                        "roomJoinTime":   e.app[appName].connection[easyrtcid].room[roomName].enteredOn,
                        "presence":       e.app[appName].connection[easyrtcid].presence
                    };

                    if(!_.isEmpty(e.app[appName].connection[easyrtcid].apiField)) {
                        roomDataDelta.clientListDelta.updateClient[easyrtcid].apiField= e.app[appName].connection[easyrtcid].apiField;
                    }
                    if(e.app[appName].connection[easyrtcid].username) {
                        roomDataDelta.clientListDelta.updateClient[easyrtcid].username= e.app[appName].connection[easyrtcid].username;
                    }
                    // TODO: Add additional fields

                }

                callback(null, roomDataDelta);
            };

    
    
            /**
             * NOT YET IMPLEMENTED - Returns an array of all field names within the connection room.
             * 
             * @ignore
             * @memberof    pub.appObj.connectionObj.connectionRoomObj
             * @param       {function(Error, Array.<string>)} callback Callback with error and array containing all field names.
             */
            connectionRoomObj.getFieldNames = function(callback) {
                var fieldNames = new Array();
                for (var key in e.app[appName].connection[easyrtcid].room[roomName].field) {
                    fieldNames.push(key);
                };
                callback(null, fieldNames);    
            };
    
    
            /**
             * NOT YET IMPLEMENTED - Returns application field value for a given field name. Returns null if field name is not found.
             * 
             * @ignore
             * @memberof    pub.appObj.connectionObj.connectionRoomObj
             * @param       {string}    Field name
             * @param       {function(Error, Object)} callback Callback with error and field value (any type)
             */
            connectionRoomObj.getField = function(fieldName,callback) {
                if (!e.app[appName].connection[easyrtcid].room[roomName].field[fieldName]) {
                    pub.util.logDebug("Can not find room field: '" + fieldName +"'");
                    callback(new pub.util.ConnectionWarning("Can not find room field: '" + fieldName +"'"));
                    return;
                }
                callback(null, e.app[appName].connection[easyrtcid].room[roomName].field[fieldName].data);
            };


            /**
             * NOT YET IMPLEMENTED - Sets connection room field value for a given field name. Returns false if field could not be set.
             * 
             * @ignore
             * @memberof    pub.appObj.connectionObj.connectionRoomObj
             * @param       {string}    fieldName       Must be formatted according to "fieldNameRegExp" option.
             * @param       {Object}    fieldValue
             * @param       {Object}    fieldOptions    Field options (to be implemented in future. Options for sharing fields to the API with possible group restrictions)
             * @param       {nextCallback} next         A success callback of form next(err). Possible err will be instanceof (ConnectionWarning). 
             */
            connectionRoomObj.setField = function(fieldName, fieldValue, fieldOptions, next) {
                if (!pub.getOption("fieldNameRegExp").test(fieldName)) {
                    pub.util.logWarning("Can not create connection room field with improper name: '" + fieldName +"'");
                    callback(new pub.util.ConnectionWarning("Can not create connection room field with improper name: '" + fieldName +"'"));
                    return;
                }
                e.app[appName].connection[easyrtcid].room[roomName].field[fieldName] = {data:fieldValue};
                next(null);
            };
 
            callback(null, connectionRoomObj);
        };


        /**
         * Removes a connection object. Does not (currently) remove connection from rooms or groups.
         * 
         * @memberof    pub.appObj.connectionObj
         * @param       {nextCallback} next         A success callback of form next(err). 
         */
        connectionObj.removeConnection = function(next) {
            if(e.app[appName] && _.isObject(e.app[appName].connection) && e.app[appName].connection[easyrtcid]){
                e.app[appName].connection[easyrtcid].isAuthenticated = false;
                delete e.app[appName].connection[easyrtcid];
            }
            next(null);
        };

        callback(null, connectionObj);
    };


    /**
     * Creates a new connection with a provided connection key
     * 
     * @memberof    pub.appObj
     * @param       {string}    easyrtcid   EasyRTC unique identifier for a socket connection.
     * @param       {function(Error, Object)} callback Callback with error and object containing EasyRTC connection object (same as calling connection(easyrtcid))
     */
    appObj.createConnection = function(easyrtcid, callback) {
        if (!easyrtcid || !pub.getOption("easyrtcidRegExp").test(easyrtcid)) {
            pub.util.logWarning("Can not create connection with improper name: '" + easyrtcid +"'");
            callback(new pub.util.ConnectionWarning("Can not create connection with improper name: '" + easyrtcid +"'"));
            return;
        }

        if (e.app[appName].connection[easyrtcid]) {
            pub.util.logWarning("Can not create connection which already exists: '" + easyrtcid +"'");
            callback(new pub.util.ConnectionWarning("Can not create connection which already exists: '" + easyrtcid +"'"));
            return;
        }

        // Set the connection structure with some default values
        e.app[appName].connection[easyrtcid] = {
            easyrtcid:      easyrtcid,
            connectOn:      Date.now(),
            isAuthenticated:false,
            userName:       null,
            credential:     null,
            apiField:       {},
            field:          pub.util.deepCopy(appObj.getOption("connectionDefaultField")),
            group:          {},
            presence: {
                show:       "chat",
                status:     null
            },
            room:           {},
            toApp: e.app[appName]
        };


        appObj.connection(easyrtcid, callback);
    };


    /**
     * Creates a new room, sending the resulting room object to a provided callback.
     *
     * @memberof    pub.appObj
     * @param       {string}    roomName    
     * @param       {function(Error, Object)} callback Callback with error and object containing EasyRTC room object (same as calling appObj.room(roomName))
     */
    appObj.createRoom = function(roomName, callback) {
        if (!roomName || !pub.getOption("roomNameRegExp").test(roomName)) {
            pub.util.logWarning("Can not create room with improper name: '" + roomName +"'");
            callback(new pub.util.ApplicationWarning("Can not create room with improper name: '" + roomName +"'"));
            return;
        }
        if (e.app[appName].room[roomName]) {
            pub.util.logWarning("Can not create room which already exists: '" + roomName +"'");
            callback(new pub.util.ApplicationWarning("Can not create room which already exists: '" + roomName +"'"));
            return;
        }

        e.app[appName].room[roomName] = {
            roomName:           roomName,
            clientList:         {},
            field:              {},
            option:             {},
            modifiedOn:         Date.now()
        };

        appObj.room(roomName, callback);
    };


    /**
     * Creates a new session with a provided session key
     * 
     * @memberof    pub.appObj
     * @param       {string}    sessionKey  Session key. Must be formatted according to "sessionKeyRegExp" option.
     * @param       {function(Error, Object)} callback Callback with error and object containing EasyRTC session object (same as calling session(sessionKey))
     */
    appObj.createSession = function(sessionKey, callback) {
        if (!sessionKey || !pub.getOption("sessionKeyRegExp").test(sessionKey)) {
            pub.util.logWarning("Can not create session with improper name: '" + sessionKey +"'");
            callback(new pub.util.ConnectionWarning("Can not create session with improper name: '" + sessionKey +"'"));
            return;
        }
        if (e.app[appName].session[sessionKey]) {
            pub.util.logWarning("Can not create session which already exists: '" + sessionKey +"'");
            callback(new pub.util.ConnectionWarning("Can not create session which already exists: '" + sessionKey +"'"));
            return;
        }

        e.app[appName].session[sessionKey] = {
            easyrtcsid: sessionKey,
            startOn: Date.now(),
            field:{}
        };
        appObj.session(sessionKey, callback);
    };


    /**
     * Checks if a provided room is defined. Returns a boolean if room is defined
     *
     * @memberof    pub.appObj
     * @param       {function(Error, {boolean})} callback Callback with error and boolean of whether room is defined.
     */
    appObj.isRoom = function (roomName, callback) {
        callback(null, (e.app[appName].room[roomName]?true:false));
    };


    /**
     * NOT YET IMPLEMENTED - Gets group object for a given group name. Returns null if group not found.
     * The returned group object includes functions for managing group fields. 
     *
     * @memberof    pub.appObj
     * @param       {string}    Group name
     * @param       {function(Error, Object)} callback Callback with error and object containing EasyRTC group object.
     */
    appObj.group = function(groupName, callback) {
        if (!e.app[appName].group[groupName]) {
            pub.util.logWarning("Attempt to request non-existant group name: '" + groupName +"'");
            callback(new pub.util.ApplicationWarning("Attempt to request non-existant group name: '" + groupName +"'"));
            return;
        }

        var groupObj = {};


        /**
         * NOT YET IMPLEMENTED - Returns an array of all field names within the group.
         *
         * @ignore
         * @param {function(Error, Array.<string>)} callback Callback with error and array containing all field names.
         */
        groupObj.getFieldNames = function(callback) {
            var fieldNames = new Array();
            for (var key in e.app[appName].group[groupName].field) {
                fieldNames.push(key);
            };
            callback(null, fieldNames);    
        };


        /**
         * NOT YET IMPLEMENTED - Returns application field value for a given field name. Returns null if field name is not found.
         *  
         * @ignore
         * @param       {string} Field name
         * @param       {function(Error, Object)} callback Callback with error and field value (any type)
         */
        groupObj.getField = function(fieldName, callback) {
            if (!e.app[appName].group[groupName].field[fieldName]) {
                pub.util.logDebug("Can not find group field: '" + fieldName +"'");
                callback(new pub.util.ApplicationWarning("Can not find app field: '" + fieldName +"'"));
                return;
            }
            callback(null, e.app[appName].group[groupName].field[fieldName]);
        };


        /**
         * NOT YET IMPLEMENTED - Sets application field value for a given field name. Returns false if field could not be set.
         *  
         * @ignore
         * @param       {string} fieldName      Field name. Must be formatted according to "fieldNameRegExp" option.
         * @param       {Object} fieldValue     Field value (can be any type)
         * @param       {Object} fieldOptions   Field options (to be implemented in future. Options for sharing fields to the API with possible group restrictions)
         * @param       {nextCallback}  next    A success callback of form next(err). Possible err will be instanceof (ApplicationWarning). 
         */
        groupObj.setField = function(fieldName, fieldValue, fieldOptions, next) {
            if (!_.isFunction(next)) {
                next = pub.util.nextToNowhere;
            }
            if (!pub.getOption("fieldNameRegExp").test(fieldName)) {
                pub.util.logWarning("Can not create field with improper name: '" + fieldName +"'");
                next(new pub.util.ApplicationWarning("Can not create field with improper name: '" + fieldName +"'"));
                return;
            }
            e.app[appName].group[groupName].field[fieldName] = {data:fieldValue};
            next(null);
        };

        /**
         * NOT YET IMPLEMENTED - Returns an array of all connected clients within the room.
         *
         * @ignore
         * @param {function(Error, Array.<string>)} callback Callback with error and array containing all easyrtcid's.
         */
        groupObj.getConnections = function(callback) {
            var connectedEasyrtcidArray = new Array();
            for (var key in e.app[appName].group[groupName].clientList) {
                connectedEasyrtcidArray.push(key);
            };
            callback(null, connectedEasyrtcidArray);    
        };
        
        callback(null, groupObj);
    };


    /**
     * Gets room object for a given room name. Returns null if room not found.
     * The returned room object includes functions for managing room fields. 
     *
     * @memberof    pub.appObj
     * @param       {string}    Room name
     * @param       {function(Error, Object)} callback Callback with error and object containing EasyRTC room object.
     */
    appObj.room = function(roomName, callback) {
        if (!e.app[appName].room[roomName]) {
            pub.util.logWarning("Attempt to request non-existant room name: '" + roomName +"'");
            callback(new pub.util.ApplicationWarning("Attempt to request non-existant room name: '" + roomName +"'"));
            return;
        }

        var roomObj = {};


        /**
         * Gets individual option value. Will first check if option is defined for the room, else it will revert to the application level option (which will in turn fall back to the global level).
         * 
         * @param       {Object}    option      Option name     
         * @return      {string}    Option value (can be any type)
         */
        roomObj.getOption = function(optionName) {
            return ((e.app[appName].room[roomName].option[optionName] === undefined) ? pub.getOption(optionName) : (e.app[appName].room[roomName].option[optionName])); 
        };
    
    
    
        /**
         * Sets individual option which applies only to this room. Set value to NULL to delete the option (thus reverting to global option)
         * 
         * @param       {Object}    option      Option name     
         * @param       {Object}    value       Option value
         * @return      {Boolean}               true on success, false on failure
         */
         roomObj.setOption = function(optionName, optionValue) {
            // Can only set options which currently exist
            if (typeof e.option[optionName] == "undefined") {
                pub.util.logError("Error setting option. Unrecognised option name '" + optionName + "'.");
                return false;
             }
        
            // If value is null, delete option from application (reverts to global option)
            if (optionValue == null) {
                if (!(e.app[appName].option[optionName] === undefined)) {
                    delete e.app[appName].room[roomName].option[optionName];
                }
            } else {
                // Set the option value to be a full deep copy, thus preserving private nature of the private EasyRTC object.
                e.app[appName].room[roomName].option[optionName] = pub.util.deepCopy(optionValue);
            }
            return true;
        };



        /**
         * NOT YET IMPLEMENTED - Returns an array of all field names within the room.
         *
         * @ignore
         * @param {function(Error, Array.<string>)} callback Callback with error and array containing all field names.
         */
        roomObj.getFieldNames = function(callback) {
            var fieldNames = new Array();
            for (var key in e.app[appName].room[roomName].field) {
                fieldNames.push(key);
            };
            callback(null, fieldNames);    
        };


        /**
         * NOT YET IMPLEMENTED - Returns application field value for a given field name. Returns null if field name is not found.
         *  
         * @param       {string} Field name
         * @param       {function(Error, Object)} callback Callback with error and field value (any type)
         */
        roomObj.getField = function(fieldName, callback) {
            if (!e.app[appName].room[roomName].field[fieldName]) {
                pub.util.logDebug("Can not find room field: '" + fieldName +"'");
                callback(null, null);
                return;
            }
            callback(null, e.app[appName].room[roomName].field[fieldName]);
        };


        /**
         * NOT YET IMPLEMENTED - Sets application field value for a given field name. Returns false if field could not be set.
         *  
         * @ignore
         * @param       {string}        Field   name
         * @param       {Object}        Field   value (can be any type)
         * @param       {Object}        Field   options (to be implemented in future. Options for sharing fields to the API with possible group restrictions)
         * @param       {nextCallback}  next    A success callback of form next(err). Possible err will be instanceof (ApplicationWarning). 
         */
        roomObj.setField = function(fieldName, fieldValue, fieldOptions, next) {
            if (!_.isFunction(next)) {
                next = pub.util.nextToNowhere;
            }
            if (!pub.getOption("fieldNameRegExp").test(fieldName)) {
                pub.util.logWarning("Can not create field with improper name: '" + fieldName +"'");
                next(new pub.util.ApplicationWarning("Can not create field with improper name: '" + fieldName +"'"));
                return;
            }
            e.app[appName].room[roomName].field[fieldName] = {data:fieldValue};
            next(null);
        };



        /**
         * Sets application field value for a given field name. Returns false if field could not be set.
         *  
         * @param       {string}    easyrtcid   EasyRTC unique identifier for a socket connection.
         * @param       {nextCallback}  next    A success callback of form next(err). 
         */
        roomObj.setConnection = function(easyrtcid, next) {
            e.app[appName].room[roomName].clientList[easyrtcid] = {enteredOn:Date.now()};
            next(null);
        };

        /**
         * Returns an array of all connected clients within the room.
         *
         * @param {function(Error, Array.<string>)} callback Callback with error and array containing all easyrtcid's.
         */
        roomObj.getConnections = function(callback) {
            var connectedEasyrtcidArray = new Array();
            for (var key in e.app[appName].room[roomName].clientList) {
                connectedEasyrtcidArray.push(key);
            };
            callback(null, connectedEasyrtcidArray);    
        };

        callback(null, roomObj);
    };


    /**
     * NOT YET IMPLEMENTED - Gets session object for a given session key. Returns null if session not found.
     * The returned session object includes functions for managing session fields. 
     *
     * @ignore
     * @memberof    pub.appObj
     * @param       {string}    Session key
     * @param       {function(Error, Object)} callback Callback with error and object containing EasyRTC session object.
     */
    appObj.session = function(sessionKey, callback) {
        if (!e.app[appName].session[sessionKey]) {
            pub.util.logWarning("Attempt to request non-existant session key: '" + sessionKey +"'");
            callback(new pub.util.ApplicationWarning("Attempt to request non-existant session key: '" + sessionKey +"'"));
            return;
        }

        var sessionObj = {};


        /**
         * NOT YET IMPLEMENTED - Returns an array of all field names within the session.
         *
         * @ignore
         * @param {function(Error, Array.<string>)} callback Callback with error and array containing all field names.
         */
        sessionObj.getFieldNames = function(callback) {
            var fieldNames = new Array();
            for (var key in e.app[appName].session[sessionKey].field) {
                fieldNames.push(key);
            };
            callback(null, fieldNames);  
        };


        /* NOT YET IMPLEMENTED - Returns application field value for a given field name. Returns null if field name is not found.
         *  
         * @ignore
         * @param       {string} Field name
         * @param       {function(Error, Object)} callback Callback with error and field value (any type)
         */
        sessionObj.getField = function(fieldName, callback) {
            if (!e.app[appName].session[sessionKey].field[fieldName]) {
                pub.util.logDebug("Can not find session field: '" + fieldName +"'");
                callback(new pub.util.ConnectionWarning("Can not find session field: '" + fieldName +"'"));
                return;
            }
            callback(null, e.app[appName].session[sessionKey].field[fieldName]);
        };


        /* NOT YET IMPLEMENTED - Sets session field value for a given field name.
         *  
         * @ignore
         * @param       {string} fieldName      Must be formatted according to "fieldNameRegExp" option.
         * @param       {Object} fieldValue     
         * @param       {Object} fieldOptions   Field options  (to be implemented in future. Options for sharing fields to the API with possible session restrictions)
         * @param       {nextCallback}  next    A success callback of form next(err). Possible err will be instanceof (ConnectionWarning). 
         */
        sessionObj.setField = function(fieldName, fieldValue, fieldOptions, next) {
            if (!_.isFunction(next)) {
                next = pub.util.nextToNowhere;
            }
            if (!pub.getOption("fieldNameRegExp").test(fieldName)) {
                pub.util.logWarning("Can not create session field with improper name: '" + fieldName +"'");
                next(new pub.util.ConnectionWarning("Can not create session field with improper name: '" + fieldName +"'"));
                return;
            }
            e.app[appName].session[sessionKey].field[fieldName] = {data:fieldValue};
            next(null);
        };

        callback(null, sessionObj);
    };


    callback(null, appObj);
};


// Documenting global callbacks
/**
 * The next callback is called upon completion of a method. If the `err` parameter is null, than the method completed successfully.
 *   
 * @callback nextCallback
 * @param {?Error}      err         Optional Error object. If it is null, than assume no error has occurred.
 */

/**
 * The application callback is called upon completion of a method which is meant to deliver an application object. If the `err` parameter is null, than the method completed successfully.
 *   
 * @callback appCallback
 * @param {?Error}      err         Error object. If it is null, than assume no error has occurred.
 * @param {?Object}     appObj      Application object. Will be null if an error has occurred.
 */

/**
 * The connection callback is called upon completion of a method which is meant to deliver a connection object. If the `err` parameter is null, than the method completed successfully.
 *   
 * @callback connectionCallback
 * @param {?Error}      err         Error object. If it is null, than assume no error has occurred.
 * @param {?Object}     connectionObj Connection object. Will be null if an error has occurred.
 */

/**
 * The room callback is called upon completion of a method which is meant to deliver a room object. If the `err` parameter is null, than the method completed successfully.
 *   
 * @callback roomCallback
 * @param {?Error}      err         Error object. If it is null, than assume no error has occurred.
 * @param {?Object}     roomObj     Room object. Will be null if an error has occurred.
 */

// Running the default listeners to initialize the events
pub.events.setDefaultListeners();