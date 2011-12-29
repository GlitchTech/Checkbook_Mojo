/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

var GuideAssistant = Class.create( commonModel, {

	initialize: function( $super ) {

		$super();

	    this.linkClickedEvent = this.linkClicked.bindAsEventListener( this );
	    this.pageStartedEvent = this.pageStarted.bindAsEventListener( this );
	    this.pageProgressEvent = this.pageProgress.bindAsEventListener( this );
	    this.pageStoppedEvent = this.pageStopped.bindAsEventListener( this );
	    this.pageErrorEvent = this.pageError.bindAsEventListener( this );
	},

	setup: function() {

		this.controller.setupWidget(
					"gtsWeb",
					{
						url: 'http://glitchtechscience.com/webOS/checkbook/cbguide.php?inApp=true&loc=' + Mojo.Locale.getCurrentLocale() + '&ts=' + Date.parse( Date() ),
						interrogateClicks: true,
						virtualpagewidth: 320
					},
					{}
				);

		this.setupLoadingSystem();

		var sceneMenuModel = {
							visible: true,
							items: [
								Mojo.Menu.editItem,
								appMenuPrefAccountsDisabled,
								appMenuFeaturesDisabled,
								cbAboutItem,
								{
									label: $L( "Help" ),
									command: "help",
									disabled: true
								}
							]
						};

		this.controller.setupWidget( Mojo.Menu.appMenu, appMenuOptions, sceneMenuModel );
	},

	ready: function() {

		Mojo.Event.listen( this.controller.get( 'gtsWeb' ), Mojo.Event.webViewLinkClicked, this.linkClickedEvent );
		Mojo.Event.listen( this.controller.get( 'gtsWeb' ), Mojo.Event.webViewLoadStarted, this.pageStartedEvent );
		Mojo.Event.listen( this.controller.get( 'gtsWeb' ), Mojo.Event.webViewLoadProgress, this.pageProgressEvent );
		Mojo.Event.listen( this.controller.get( 'gtsWeb' ), Mojo.Event.webViewLoadStopped, this.pageStoppedEvent );
		Mojo.Event.listen( this.controller.get( 'gtsWeb' ), Mojo.Event.webViewLoadFailed, this.pageErrorEvent );
	},

	//500ms before activate
	aboutToActivate: function() {

		this.updateLoadingSystem( false, "", "", 0 );
	},

	//Scene made visible
	activate: function( event ) {
	},

	linkClicked: function( clickEvent ) {

		if( clickEvent.url.toLowerCase.indexOf( "mailto:glitchtechscience@gmail.com" ) >= 0 ) {

			sendEmail( "Checkbook - Contact Request", "" );
		} else if( clickEvent.url.toLowerCase.indexOf( "developer.palm.com" ) >= 0 ) {

			//app catalog
		} else if( clickEvent.url.indexOf( "#" ) < 0 ){

			this.controller.serviceRequest(
						"palm://com.palm.applicationManager",
						{
							method: "open",
							parameters:  {
								id: 'com.palm.app.browser',
								params: {
									target: clickEvent.url
								}
							}
						}
					);
		} else {

			//Currently use JavaScript code to scroll, might leave it that way
			//this.controller.getSceneScroller().mojo.revealElement( clickEvent.url.replace( /.*#/, "" ) );
		}
	},

	pageStarted: function() {

		this.updateLoadingSystem( true, $L( "Loading The Guide" ), $L( "Don't Panic" ), 0 );
	},

	pageProgress: function( pageProgressEvent ) {

		this.updateLoadingSystem( true, $L( "Loading The Guide" ), $L( "Don't Panic" ), ( pageProgressEvent.progress / 100 ) );
	},

	pageStopped: function() {

		this.updateLoadingSystem( false, "", "", 0 );
	},

	pageError: function(pageErrorEvent) {

		this.updateLoadingSystem( true, $L( "Error Loading Page" ), $L( "Error Code: " ) + pageErrorEvent.errorCode + "<br />" + $L( "Message: " ) + pageErrorEvent.message, 0.75 );
	},

	deactivate: function( event ) {
	},

	cleanup: function( event ) {

		Mojo.Event.stopListening( this.controller.get( 'gtsWeb' ), Mojo.Event.webViewLinkClicked, this.linkClickedEvent );
		Mojo.Event.stopListening( this.controller.get( 'gtsWeb' ), Mojo.Event.webViewLoadStarted, this.pageStartedEvent );
		Mojo.Event.stopListening( this.controller.get( 'gtsWeb' ), Mojo.Event.webViewLoadProgress, this.pageProgressEvent );
		Mojo.Event.stopListening( this.controller.get( 'gtsWeb' ), Mojo.Event.webViewLoadStopped, this.pageStoppedEvent );
		Mojo.Event.stopListening( this.controller.get( 'gtsWeb' ), Mojo.Event.webViewLoadFailed, this.pageErrorEvent );
	}
} );
