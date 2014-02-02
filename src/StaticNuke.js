/**
 * @fileOverview - The "Static Ding!" bookmarklet
 *
 * @description - Walks the DOM and changes any "position: fixed" html elements
 * to "position: relative" so they will scroll.  If run in "nuke" mode, it also 
 * changes them to "opacity: 0" and "display: none".
 *
 * @version 0.1.0-2014.01.28
 * @author Matt Kaplan
 * @license MIT
 */


/**
 * Entire bookmarklet is wrapped in immediately invoked function that
 * returns nothing to global scope.
 *
 * @param {object} window - Localize the global object for minification
 * and possible performance benefit.
 *
 * @param {object} document - Localize.
 *
 * @param {string} mode - Optionally set bookmarklet's mode, i.e., how it
 * alters "position: fixed" elements. Default is "D" (for "ding"). If "D",
 * elements are only changed to "position: relative". If "N" (for "nuke") is
 * passed, elements also are changed to "opacity: 0" and "display: none".
 *
 * @param {undefined} undefined - Ensure "undefined" is undefined.
 *
 * @returns {void}
 */
(function(window, document, mode, undefined) {

"use strict";

////////////////////////////////
//  TABLE OF CONTENTS
////////////////////////////////
//
//  I.  PROPERTIES
//
//     A.  Ordinary Properties (in root bookmarklet namespace)
//
//     B.  DialogBox Namespace
//
//     C.  Utilities Namespace ("Utils")
//
//  II. METHODS
//
//     A.  Ordinary Methods (in root bookmarklet namespace)
//
//     B.  DialogBox Methods
//
//     C.  Utilities ("Utils") Methods
//
//  III. RUN
//
////////////////////////////////



////////////////////////////////
//  I.  PROPERTIES
////////////////////////////////

// --------------------------------------------
//  A.  Ordinary Properties (in root namespace)
// ---------------------------------------------

/**
 * A container for the bookmarklet's configuration variables.
 * @type {object}
 */
var config = {

	/**
	* The bookmarklet's mode. Can be "D" (for "ding") or "N" (for "nuke").
	* @enum {String}
	*/
	mode: 'D',

	/**
	* A start message to show the user in a dialog box.
	* @type {string}
	*/ 
	startMsg: 'Checking&hellip;',

	/**
	* A htmlentity triangle shape to precede the start message, for decoration.
	* @type {string}
	*/
	msgPrefixIcon: '&#9651;',

	/**
	* An adjective to inform the user how elements were changed: i.e., either
	* to "scrollable" (in "ding" mode) or "invisible" (in "nuke" mode).
	* @enum {string}
	*/
	resultAdjective: 'scrollable'

},

/**
 * A counter for the number of elements examined by the bookmarklet.
 * @type {number}
 */
elementCount = 0,

/**
 * A counter for the number of elements changed by the bookmarklet.
 * @type {number}
 */
interventionCount = 0,


/**
 * A flag variable for whether the DOM inspection has finished.
 * @type {boolean}
 */
finishedDOMcheck = false,


// ------------------------------------------
//  B.  DialogBox Namespace 
// ------------------------------------------

/**
 * Represents a Dialog Box UI, to inform that the bookmarklet is running, and
 * what the results were when finished.
 * @type {object}
 */
DialogBox = {

	/**
	* A container for any DialogBox configuration variables.
	* @type {object}
	*/
	config: {

		/** @type {string} */
		lightOffChar: '&#9675;',

		/** @type {string} */
		lightOnChar: '&#9679;',

		/** @type {number} */
		lightFlashDelay: 500
	},

	/**
	* To be an html div to serve as the bottom layer of the dialog box UI.
	* @type {object}
	*/
	bottomLayer: null,

	/**
	* To be an html div to serve as the top layer of the dialog box UI.
	* @type {object}
	*/
	topLayer: null,

	/**
	* To be an html ul to hold a flashing-lights style "working" indicator
	* for the dialog box.
	* @type {object}
	*/
	lightsHolder:	null,


	/**
	* To be an html collection to hold li elements to serve as "lights" for the
	* dialog box's 'working' indicator.
	* @type {object}
	*/
	lights:	null,

	/**
	* HTML fragment to form the "lightsHolder" and its initial contents.
	* @type {string}
	*/
	lightsHtmlFrag:	'<ul>' +
					'<li>&#9675;</li>' +
					'<li>&#9675;</li>' +
					'<li>&#9675;</li>' +
					'</ul>',

	/**
	* Flag variable to indicate if the dialog box divs have been inserted into
	* or removed fro the DOM.
	* @type {boolean}
	*/
	inDOM: false,

	/**
	* Flag variable to indicate if the dialog box divs' opacity are > 0.
	* @type {boolean}
	*/
	visible: false
	
},



// ------------------------------------------
//  C.  Utilities Namespace
// ------------------------------------------

/**
 * A container/namespace for utility functions.
 *
 * @type {object}
 */
Utils = { };



////////////////////////////////
//  II.  METHODS
////////////////////////////////

// -----------------------------
//  A.  Ordinary Methods
// -----------------------------

/**
 * Starts the bookmarklet's execution, and directly or indirectly calls
 * all other functions. Aborts by returning early if first function it calls
 * ("initialize") returns false.
 *
 * returns {boolean} - false early if aborts; true at end if fully executes.
 */
function main() {
	
	// Initialize, and abort if fails.
	if ( !initialize() ) {
		return false;
	}
	
	announceStart(config.startMsg);
		
	Utils.walk_DOM(document.body, filterElem);
	

	// For development or debugging the dialog box: A timer to mimic a
	// long-running DOM check so the 'work in progress' dialog box state will
	// show longer.  To use, uncomment the if control block.  For production
	// and minification, delete entire if control block.
	/*
	if (true) {
		setTimeout( function() {

			finishedDOMcheck = true;

			reportDone();

		}, 4000 );

		return true;
	}
	*/

	finishedDOMcheck = true;

	reportDone();

	return true;
	
}


/**
 * Initializes bookmarklet, using helper methods:  (1) Checks to make sure 
 * another instance of the bookmarklet is not running in the same environment 
 * and aborts self if another is (e.g., if user clicked >1 times before first 
 * execution finished). (2) Checks own "mode" argument and updates config if 
 * it's "N" (for "nuke").
 *
 * @returns {boolean} - indicating if initialization succeeded or failed.
 */
function initialize() {

	if ( detectRunningAlready() ) {
		return false;
	}

	checkMode();
	
	return true;
}


/**
 * Checks if another instance of the bookmarklet is already running
 * in the same environment. Uses presence of first DialogBox div in the DOM
 * as a proxy. Assumes expected className and data- attribute values will
 * accurately identify a div as coming from the bookmarklet's DialogBox.
 *
 * @returns {boolean}
 */
function detectRunningAlready() {

	var ownElementsDetected = document.getElementsByClassName('StaticDing');

	if( ownElementsDetected.length > 0 ) {

		if ( ownElementsDetected[0].getAttribute('data-sd') === 'ding' ) {

			return true;

		}
	}

	return false;
}


/**
 * Checks mode parameter and updates config if it's "N" (for "nuke").
 *
 * @returns {boolean} - indicating if initialization succeeded or failed.
 */
function checkMode() {

	if (mode === 'N') {

		config.mode = 'N';

		config.resultAdjective = 'invisible';

		config.msgPrefixIcon = '&#9651;+';
	}
	
}


/**
 * Informs user through dialog box UI that the bookmarklet has started.
 *
 * @param {string} msg - The text of the start message for the user.
 */
function announceStart(msg) {

	DialogBox.boot();

	DialogBox.announceStart(msg);
}


/**
 * Examines a DOM element.  If the element is "position: fixed", passes the
 * element to the "intervene".method to change it. Also increments the
 * bookmarklet's elementCount and interventionCount accordingly.
 *
 * @param {DOM element} elem - the element to filter
 */
function filterElem(elem) {

	if (elem.nodeType === 1) {
	
		var elemPosVal = Utils.getElementPosVal(elem);

		if (elemPosVal === 'fixed') {

			if ((elem === DialogBox.bottomLayer) || 
				(elem === DialogBox.topLayer) ||
				// Next 2 conditions are defensive, b/c those elements
				// shouldn't be fixed position anyway.
				(elem === DialogBox.lightsHolder) ||
				(elem.parentNode === DialogBox.lightsHolder) ) {

				// The element is part of the dialog box, 
				// so skip processing it further:
				return;
			}

			intervene(elem);

			interventionCount = interventionCount + 1;

		}

	}
	elementCount = elementCount + 1;
}


/**
 * Changes a DOM element to "position: relative". If bookmarklet is in "N"
 * ("nuke") mode, also changes the element to "opacity: 0" and "display: none".
 *
 * @param {DOM element} elem - The element to change.
 */
function intervene(elem) {

	var dingStyle, nukeStyle;

	dingStyle = 'position: relative !important;';

	nukeStyle =	dingStyle +
				'opacity: 0 !important;' +
				'display: none !important;';

	elem.style.position = 'relative';

	if (config.mode === 'N') {
		elem.style.opacity = '0';
		elem.style.display = 'none';
	}

	// Add "important" to handle pages with "important" in their stylesheet,
	// and try to do it in a cross-browser manner:
	if (elem.setAttribute) {

		elem.setAttribute('style', dingStyle);

		if (config.mode === 'N') {
			elem.setAttribute('style', nukeStyle);
		}
	}
	else if (elem.style.cssText) {

		elem.style.cssText = dingStyle;

		if (config.mode === 'N') {
			elem.style.cssText = nukeStyle;
		}
	}
}

/**
 * Creates a message to report the bookmarklet's results, and passes the message
 * to the DialogBox for display to the user.
 */
function reportDone( ) {

	var	msg = '',
		elementsNoun = 'elements';

	if ( interventionCount === 0 ) {
		msg = 'Made no changes.';
		DialogBox.reportDone(msg);
		return;
	}

	if ( interventionCount === 1 ) {
		elementsNoun = 'element';
	}
	
	msg = 'Made ' + interventionCount + ' ' +
				elementsNoun + ' ' + config.resultAdjective + '.';

	DialogBox.reportDone(msg);

}



// --------------------------------
//  B.  DialogBox Methods
// --------------------------------

/**
 * Creates the top and bottom layers of the DialogBox (each an html div)
 * element) and assigns them to their corresponding properties. Does not
 * insert them into the DOM, however.
 */
DialogBox.boot = function() {

	DialogBox.bottomLayer = DialogBox.makeBottomLayer();

	DialogBox.topLayer = DialogBox.makeTopLayer();

};


/**
 * Announces the start of a process (e.g., of the bookmarklet here). Receives
 * and passes a start message with a "work in progress" animation of "flashing
 * lights" into the DialogBox. Then inserts the DialogBox into the DOM.
 *
 * @param {string} msg - The start message to display.
 */
DialogBox.announceStart = function(msg) {
		
	msg = DialogBox.styleMsg(msg, config.msgPrefixIcon);

	DialogBox.topLayer.innerHTML = msg;

	DialogBox.addLights();
	
	DialogBox.showSelf();

	setTimeout( DialogBox.animateLights, 400);
};


/**
 * Styles a message for display by the dialog box, including by prepending
 * an optional prefix icon.
 *
 * @param {string} msg - The message to style.
 * @param {string} [prefixIcon] - An optional prefix icon to add.
 * @returns {string} msg - The message styled and with any prefix added.
 */
DialogBox.styleMsg = function(msg, prefixIcon) {

	if(prefixIcon) {

		prefixIcon = Utils.spanWrap(prefixIcon, 
			'style="vertical-align: text-top; font-size: 1.3em; display: inline; padding: 0; margin: 0; white-space: nowrap;"');

		msg = prefixIcon + ' '+ msg;
	}

	msg = Utils.spanWrap(msg, 'style="background-color: #B8C0C8; display: inline; padding: 0; margin: 0;"');

	return msg;
};


/**
 * Adds "lights" indicator to the DialogBox's top layer.
 */
DialogBox.addLights = function() {

	var num_lights, i, lhs, ls;	

	DialogBox.topLayer.innerHTML =	DialogBox.topLayer.innerHTML + 
									DialogBox.lightsHtmlFrag;

	DialogBox.lightsHolder = DialogBox.topLayer.getElementsByTagName('ul')[0];
	
	DialogBox.lights = DialogBox.lightsHolder.getElementsByTagName('li'); 

	num_lights = DialogBox.lights.length;
	i = num_lights;

	lhs = DialogBox.lightsHolder.style;

	lhs = DialogBox.lightsHolder.style;
	lhs.position = 'relative';
	lhs.margin = '0 auto';
	lhs.padding = '0';
	lhs.textAlign = 'center';
	lhs.top = '1.5em';
	lhs.width = '60%';

	while (i) {
		ls = DialogBox.lights[i-1].style;  // -1 to account for 0 key.

		ls.display = 'inline';
		ls.margin = '0';
		ls.padding = '0';
		if ( i > 1 ) {
			ls.paddingLeft = '18%';
		}
		ls.backgroundColor = '#B8C0C8';
		
		i = i - 1;
	}

};


/**
 * Make the "lights" of the DialogBox's "flash" on and off in looped sequence
 * to indicate bookmarklet is "working".
 */
DialogBox.animateLights = function() {

	var	num_lights = DialogBox.lights.length,
		currentLight = 0,
		nextLight = 1,
		forward = true;


	function turnOn(el) {
		el.innerHTML = DialogBox.config.lightOnChar;
	}

	function turnOff(el) {
		el.innerHTML = DialogBox.config.lightOffChar;
	}

	turnOn(DialogBox.lights[0]);

	setTimeout(switchLightsBackAndForth, DialogBox.config.lightFlashDelay);

	function switchLightsBackAndForth() {

		// Loop no further if bookmarklet has finished the DOM inspection.	
		if( finishedDOMcheck ) {
			return;
		}
	
		turnOff(DialogBox.lights[currentLight]);
		turnOn(DialogBox.lights[nextLight]);

		if(forward) {
			currentLight = currentLight + 1;
			nextLight = nextLight + 1;
			if ( currentLight === (num_lights - 1) ) {
				nextLight = num_lights - 2;
				forward = false;
			}
		}
		else {
			currentLight = currentLight - 1;
			nextLight = nextLight - 1;
			if (currentLight === 0) {
				nextLight = 1;
				forward = true;
			}
		}

		setTimeout(switchLightsBackAndForth, DialogBox.config.lightFlashDelay);
				
	} // End switchLightsBackAndForth.
	
}; // End animateLights.


/**
 * Inserts the DialogBox into the DOM so it can be viewed.
 */
DialogBox.showSelf = function() {

	// Defensive check: make sure not already showing before try to show self.
	
	if (DialogBox.inDOM && DialogBox.visible) {
		return;
	}

	document.body.appendChild(DialogBox.bottomLayer);
	document.body.appendChild(DialogBox.topLayer);

	DialogBox.inDOM = true;
	DialogBox.visible = true;

	DialogBox.bottomLayer.onclick = DialogBox.removeSelf;
	DialogBox.topLayer.onclick = DialogBox.removeSelf;

};


/**
 * Creates and returns the html div that is the bottom layer of the DialogBox.
 * @returns {object}
 */
DialogBox.makeBottomLayer = function() {

	var	bldiv = document.createElement('div'),
		bls = bldiv.style;

	bldiv.className = 'StaticDing';
	bldiv.setAttribute('data-sd','ding');

	bls.backgroundColor = '#708090';
	bls.backgroundImage = 'none';
	bls.border = 'none';
	bls.borderRadius = '10%';
	bls.height = '33%';
	bls.left = '33%';
	bls.margin = '0';
	bls.opacity = '0.3';
	bls.padding = '0';
	bls.position = 'fixed';
	bls.top = '33%';
	bls.width = '33%';
	bls.zIndex = '1000';

	return bldiv;
}; 


/**
 * Creates and returns the html div that is the top layer of the DialogBox.
 * @returns {object}
 */
DialogBox.makeTopLayer = function() {

	var	tldiv = document.createElement('div'),
		tls = tldiv.style;

	tldiv.className = 'StaticDing';
	tldiv.setAttribute('data-sd', 'ding');

	tls.backgroundColor = '';
	tls.backgroundImage = 'none';
	tls.border = 'none';
	tls.color = 'black';
	tls.direction = 'ltr';
	tls.font = 'normal 16px/100% arial';
	tls.height = '20%';
	tls.left = '40%';
	tls.letterSpacing = 'normal';
	tls.lineHeight = '100%';
	tls.margin = '0';
	tls.opacity = '0.9';
	tls.outline = 'none';
	tls.padding = '0';
	tls.position = 'fixed';
	tls.textAlign = 'center';
	tls.textDecoration = 'none';
	tls.textShadow = 'none';
	tls.textTransform = 'none';
	tls.top = '40%';
	tls.wordSpacing = 'normal';
	tls.width = '20%';
	tls.zIndex = '1001';
	
	return tldiv;
};


/**
 * Announces the end of a process (e.g., of the bookmarklet in this context).
 * Receives and passes a message to the DialogBox's top UI layer, and removes
 * from there the animated work-in-progress "flashing lights". Then, after a
 * short wait, removes the DialogBox from the screen and the DOM.
 *
 * @param {string} msg - The message to display.
 */
DialogBox.reportDone = function(msg) {

	msg = DialogBox.styleMsg(msg, config.msgPrefixIcon);

	DialogBox.topLayer.innerHTML = msg;

	setTimeout(DialogBox.removeSelf, 2000);
};


/**
 * Removes the DialogBox from the DOM so it can no longer be viewed. Starts
 * by fading the opacity of its html div elements, and then deletes them
 * from the DOM. Also updates the DialogBox's flag variables for tracking its
 * visibility.
 */
DialogBox.removeSelf = function() {

	// Defensive check to make sure box is showing before try to remove:
	if(!DialogBox.inDOM || !DialogBox.visible) {
		return;
	}

	Utils.fade_then_delete(DialogBox.topLayer, 50, 3000);
	Utils.fade_then_delete(DialogBox.bottomLayer, 50, 4000);
	
	DialogBox.visible = false;
	DialogBox.inDOM = false;

};


// --------------------------------
//  C. Utilities ("Utils") Methods
// --------------------------------

/**
 * Traverse DOM from start node, and pass each node to callback function.
 *
 * @param {object} node - The start node.
 * @param {object} func - The callback function.
 *
 * @author Douglas Crockford, from "JavaScript: The Good Parts" p. 35.
 */
Utils.walk_DOM = function walk(node, func) {

	func(node);
	
	node = node.firstChild;
	
	while (node) {
		walk(node, func);
		node = node.nextSibling;
	}
};


/**
 * Obtains an html element's position property, and returns its value or
 * false if it's undefined.
 *
 * @param {object} elem - An html element
 * @returns {string|false} 
 */
Utils.getElementPosVal = function(elem) {

	var	computedStyle = window.getComputedStyle(elem),
		elemPositionValue = false;

	if (computedStyle) {
		elemPositionValue = computedStyle.getPropertyValue('position');
	}
	if (elemPositionValue) {
		return elemPositionValue;
	}

	return false;
};


/**
 * Receives text and returns it inside an html span element.
 *
 * @param {string} text - The text to wrap in the span.
 * @param {string} attributesString - Attributes for the span element.
 * @returns {string} 
 */
Utils.spanWrap = function(text, attributesString) {

	var text_in_span = '<span ' + attributesString + '>' + text + '</span>';

	return text_in_span;
};


/**
 * Fades out and then deletes an html element by decrementing its opacity over
 * a defined time period, and deleting it upon opacity reaches 0.
 *
 * @param {object} elem - The target html element.
 * @param {num} num_steps - How many steps in which to decrement opacity to 0.
 * @param {num} total_time_in_ms - The time in which to perform the fade out.
 */
Utils.fade_then_delete = function(elem, num_steps, total_time_in_ms) {

	// Calculate values needed to execute a timed loop decrementing the 
	// element's opacity: 
	
	var	opac = ( elem.style.opacity || 1), // "or 1" in case opacity is undefined

		stepsize = (opac / num_steps), // amount to reduce opacity on each loop

		delay_bef_loop = (total_time_in_ms / num_steps); // delay before each loop

	// "fadeloop_and_delete()" invokes self after declaration.  It also invokes
	// self internally in a loop with a timed delay before each iteration, to fade 
	// the element's opacity to 0, after which it deletes the elemement.
	(function fadeloop_and_delete() {

		opac = opac - stepsize; // decrement opacity value

		elem.style.opacity = opac; // assign new opacity value to element

		num_steps = num_steps - 1; // decrement num_steps

		if(num_steps) {  // if num_steps are not finished, call self after delay:
		
			setTimeout( fadeloop_and_delete, delay_bef_loop);		
		}
		else { // all steps finished means fade is complete, so delete element:

				Utils.removeElemFromDOM(elem);

		} // End else.
		
	}());  // End and invocation of "fadeloop_and_delete".

}; // End of "Utils.fade_then_delete".


/**
 * Removes an html element from the DOM.
 *
 * @param {object} elem - The html element to delete.
 */
Utils.removeElemFromDOM = function(el) {

	if(el) { // Defensive check: confirm element exists.

		el.parentNode.removeChild(el); // Remove element if it exists in the DOM.

	}
};



////////////////////////////////
//  III.  RUN
////////////////////////////////

main();



}(window, document, 'N'));
