
// FastScroller.js 
// authors: anatoliy.gorskiy@aenetworks.com, ..., ....
// June 2013
//
// dependencies: jQuery / TweenLite.js / Firmin.js / Modernizr
// 
//  Example usage:
//
// <head>
// 	<script type="text/javascript">
// 		$(function(){
//
// 	        var onBounce = function(e){
// 	        	console.log("bounce "+e.direction+" / "+e.currentTarget+" / "+e.type);
//				//logs: bounce right / [object HTMLDivElement] / click 
//				//NOTE: e.direction is opposite of direction of the button - 
//				//right button makes the page scroll left
// 	        }
// 	        var onEndTrigged = function(e){
// 	        	console.log("end "+e.direction+" / "+e.currentTarget+" / "+e.type);
//				//logs: bounce right / [object HTMLDivElement] / click 
// 	        }
//	        
// 			var scrollConfig = {	
// 				divToScroll 		: $(".episode"), //jQuery object of a div to scroll. if not scrolled by means off css matrix transforms, element must be positioned relative
// 				parent 		 		: "parent", // only "parent" is supported now, it must have a width defined implicidly or explicidly
// 		        leap				: 300, //leap distance
// 		        bounce 				: true, //do bounce effect when end is first reached
//				endFollowsBounce	: false, //
// 		        useKeyboard 		: true, //allow keyboard arrows to scroll
// 		        buttonPrefix 		: "data-episode-scroll" // data attribute prefix to identify the buttons that would invoke scrolling
// 		    };
//
// 	        var theScroller = new FastScroller(scrollConfig, onBounce, onEndTrigged);
// 		});
// 	</script>
// </head>
//
// <body>
// 	<div id="episode-wrapper">
//
// 		<div class="episode">
// 			<div class="episode-item purple"></div>
// 			<div class="episode-item green"></div>
// 			<div class="episode-item yellow"></div>
// 		</div>
//
// 		<div class="arrow-left" data-episode-scroll-left>
// 		</div>
//
// 		<div class="arrow-right" data-episode-scroll-right>
// 		</div>
// 	</div>
//
// 	<script src="libs/jquery.js"></script>
// 	<script src="libs/firmin-1.0.0.js"></script>
// 	<script src="libs/TweenLite.js"></script>
// 	<script src="libs/CSSPlugin.min.js"></script>
// 	<script src="libs/CSSRulePlugin.min.js"></script>
// 	<script src="libs/modernizr.js"></script>
// 	<script src="scroller.js"></script>
// </body>



var FastScroller = function( scrollConfig, bounceCallback, reachedEndCallback ){

	"use strict";

	var content,
		parent,
		leftButton,
		rightButton,

		callbackBounce,
		callbackEnd,
		callbackData,

		leapDistance,

		useFirmin,
		doEndBounce,
		endFollowsBounce,
		doHoldScroll,
		doWheelScroll,
		doKeyboardScroll,
		doTouchScroll,

		justBounced,
		jusBouncedDirection,

		touchStartPoint,
		
		$;

	var init = function(){

		setVars();
		//measure();
		addListeners();
	};

	//set the vars, cache what you can
	var setVars = function(){

		$ = jQuery;

		content = scrollConfig.divToScroll;

		if(scrollConfig.parent === "parent"){
			parent = content.parent();
		}

		leftButton = $(document).find("["+scrollConfig.buttonPrefix+"-left]") ;
		rightButton = $(document).find("["+scrollConfig.buttonPrefix+"-right]");

		callbackBounce = bounceCallback;
		callbackEnd = reachedEndCallback;
		callbackData = {};

		leapDistance = scrollConfig.leap;

		Modernizr.addTest('webkit', function(){
			return RegExp(" AppleWebKit/").test(navigator.userAgent);
		});

		if( Modernizr.webkit && Modernizr.csstransforms){
			useFirmin = true;
		}

		//useFirmin = true;

		doEndBounce = scrollConfig.bounce;
		endFollowsBounce = scrollConfig.endFollowsBounce;
		doHoldScroll = scrollConfig.holdToScroll;
		doWheelScroll = scrollConfig.useMouseWheel;
		doKeyboardScroll = scrollConfig.useKeyboard;
		doTouchScroll = scrollConfig.useTouch;
	};


	//add click listeners
	var addListeners = function(){

		// button scrolling
		leftButton.click(function(e){
			moveContent(e);
		});

		rightButton.click(function(e){
			moveContent(e);
		});

		// keyboard scrolling
		if( doKeyboardScroll ){

			$(document).keydown(function(e){
				//left arrow
			    if ( e.keyCode == 37 || e.keyCode == 39 ) { 
			    	moveContent(e);
			        return false;
			   	}
			});
		}

		if( doTouchScroll){
			content.swipe({
		        //Generic swipe handler for all directions
		        swipeStatus:function(event, phase, direction, distance, duration, fingers) {

		        	handleSwipe(event, phase, direction, distance, duration, fingers);
		        	
		        },
		        //Default is 75px, set to 0 for demo so any distance triggers swipe
		        threshold:0
	      	});
		}

		if(doWheelScroll){
			parent.mousewheel(function(event, delta, deltaX, deltaY) {
			    handleWheel(event, delta, deltaX, deltaY);
			});
		}
		
		
	};	


	var handleWheel = function(event, delta, deltaX, deltaY){
		//console.log("delta "+delta);
		console.log("deltaX "+deltaX);
		//console.log("deltaY "+deltaY);
		touchStartPoint = getLeftOffset(content);
		setLeftOffset(content, touchStartPoint-deltaX);
		event.preventDefault();

	};


	var handleSwipe = function(event, phase, direction, distance, duration, fingers){

		console.log(" phase " + phase); 

		if(phase === "start"){
			touchStartPoint = getLeftOffset(content);

		}
		else if(phase === "move"){
			var whereTo;
			if(direction === "left")
				whereTo = touchStartPoint - distance;
			else
				whereTo = touchStartPoint + distance;

			setLeftOffset(content, whereTo);

		}
		else if(phase === "end"){
			return;
		}
		//console.log(" direction " + direction); 
		//console.log(" distance " + distance);  
		  
	};

	//get to business
	var moveContent = function(event){

		var scrollCaller = getScrollCaller(event);
		var callerType = scrollCaller.type;
		var direction = scrollCaller.direction;

		var isEnd = isAtEnd(direction);
		//console.log("is at end "+isEnd+" "+direction);

		//console.log("space left to move "+direction+" is "+getSpaceLeftToMove(direction));

		if(!isEnd){

			var spaceLeftToMove = getSpaceLeftToMove(direction);
			var currOffset = getLeftOffset(content);

			var whereTo;
			var theLeap;

			if(spaceLeftToMove >= leapDistance)
				theLeap = leapDistance;
			else
				theLeap = spaceLeftToMove;

			if(direction === "left")
				whereTo = currOffset - theLeap;
			else
				whereTo = currOffset + theLeap;
			
			setLeftOffset(content, Math.round(whereTo), 2);

			justBounced = false;
			jusBouncedDirection = direction;
		}
		else{

			callbackData.direction = direction;
			callbackData.currentTarget = scrollCaller.currentTarget;
			callbackData.type = callerType;

			//console.dir(callbackData);

			if( (doEndBounce && !justBounced) || (doEndBounce && !endFollowsBounce) ){
				bounce(direction);

				if(callbackBounce)
					callbackBounce(callbackData);

				justBounced = true;
				jusBouncedDirection = direction;
			}
			else{
				if(callbackEnd)
					callbackEnd(callbackData);

				justBounced = false;
				jusBouncedDirection = direction;
			}
		}

		//direction
		//console.log("is at "+direction+" end is "+isEnd);
	};


	//UTILITY FUNCTIONS

	var bounce = function(direction){
		var currentPosition = getLeftOffset(content);
		var bounceRange = 30;

		var whereTo;

		if(direction === "right"){
			whereTo = currentPosition + bounceRange;
		}
		else{
			whereTo = currentPosition - bounceRange;
		}



		setLeftOffset(content, Math.round(whereTo), 0.2 );
		setTimeout( function(){

			setLeftOffset(content, currentPosition, 0.5 );
		}, 200);


	};
	

	var isAtEnd = function(direction){
		var isEnd;
		if(direction === "right"){
			if( getLeftOffset(content) === 0 )
				return true;
			else
				return false;

		}
		else if(direction === "left"){
			if( getLeftOffset(content) === ( parent.outerWidth() - content.outerWidth() ) )
				return true;
			else
				return false;
		}
	};

	var getSpaceLeftToMove = function(direction){
		if(direction === "left"){
			return ( getLeftOffset(content) + content.outerWidth() ) - parent.outerWidth();
		}
		else{
			return 0 - getLeftOffset(content);
		}
	};


	var getLeftOffset = function(el){
		if(!useFirmin)	
			return el.position().left;
		else
			return getLeftOffsetMatrix(el);
	};


	var setLeftOffset = function(el, value, time){
		if(useFirmin)
			Firmin.translateX(el[0], value, time+"s");
		else
			TweenLite.to(el, time, {left:value, ease:Strong.easeOut});
	};



	var getScrollCaller = function(event){

		var scrollDirection;

		if(event.type === "click") {

			if(event.currentTarget === leftButton[0]){
				scrollDirection = "right";
			}else{
				scrollDirection = "left";
			}
			
		}
		else if(event.type === "keydown"){

			if(event.which === 39){
				scrollDirection = "left";
			}else{
				scrollDirection = "right";
			}
		}

		return {
			type 			: event.type,
			direction 		: scrollDirection,
			currentTarget	: event.target
		};
	};

	var getLeftOffsetMatrix = function( el ){

		var style = window.getComputedStyle(el[0]).webkitTransform;
		var theMatrix = style.replace(/^matrix\(/, '').replace(/\)$/, '').split(', ');

		if( theMatrix[0] === "none")
			return 0;
		else
			return parseFloat(theMatrix[4]);
	};

	//kick it off
	init();

}



