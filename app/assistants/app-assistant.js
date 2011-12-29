/* Copyright 2009 and forward GlitchTech Science. All rights reserved. */

/*
** BETA VERSION **
"title": "Checkbook Beta",
"id": "com.glitchtechscience.checkbookbeta",

** LIVE VERSION **
"title": "Checkbook",
"id": "com.glitchtechscience.checkbook",
*/

/** Global Variables **/
//Menu Items
var appMenuOptions;
var appMenuPrefAccounts;
var appMenuFeatures;
var cbHelpItem;
var cbAboutItem;

var appMenuModel;

//DB Access
var accountsDB;

//App Prefs
var checkbookPrefs = {};

//Global Systems
var accountSortOptionsModel;
var accounts_obj;
var bal_view;

//Stage Names
var MainStageName = "main";
var DockStageName = "dockView";
var SearchStageName = "searchView";

var AppAssistant = Class.create( {

	initialize: function( appController ) {

		this.appController = appController;
	},

	/**
	  * params - object containing launch parameters
	  *
	  * params.touchstoneMode - boolean: True when dockmode is active
	  */
	handleLaunch: function( params ) {

		if( params && params.dockMode ) {
			//launch the touchstone theme

			this.launchTouchstone();

		} else if( params && params.query ) {
			//launch the search system

			this.launchSearch( params.query );
		} else {

			this.normalLaunch();
		}
	},

	/*****************/
	/** Normal Mode **/
	/*****************/
	normalLaunch: function() {

		var mainStage = this.controller.getStageController( MainStageName );

		if( mainStage ) {

			mainStage.window.focus();
		} else {

			var defaultAppStageScene = function( stageController ) {

				stageController.pushScene( 'splash' );
			}.bind( this );

			this.controller.createStageWithCallback(
					{
						name: MainStageName,
						assistantName: 'StageAssistant',
						lightweight: true
					},
					defaultAppStageScene
				);
		}
	},

	/*********************/
	/** Exhibition Mode **/
	/*********************/
	launchTouchstone: function() {

		var dockStage = this.controller.getStageController( DockStageName );

		if( dockStage ) {

			dockStage.window.focus();
		} else {

			var dockStage = function( stageController ) {

				stageController.pushScene( 'exhibitionmode', { dockmode: true } );
			}.bind( this );

			this.controller.createStageWithCallback(
					{
						name: DockStageName,
						lightweight: true
					},
					dockStage,
					"dockMode"
				);
		}
	},

	/*****************/
	/** Search Mode **/
	/*****************/
	launchSearch: function( query ) {

		//https://developer.palm.com/content/api/dev-guide/mojo/just-type.html

		var searchStage = this.controller.getStageController( SearchStageName );

		if( searchStage ) {

			searchStage.window.focus();
		} else {

			var queryObj = {
				desc: query,
				date: "",
				cleared: "",
				note: query,
				amount: query,
				run: true
			};

			var searchStageScene = function( stageController ) {

				stageController.pushScene( 'search-transactions', queryObj );
			}.bind( this );

			this.controller.createStageWithCallback(
					{
						name: SearchStageName,
						lightweight: true
					},
					searchStageScene
				);
		}
	},

	/******************/
	/** Menu Control **/
	/******************/
	handleCommand: function( event ) {

		var stageController = this.controller.getStageController( MainStageName );

		if( stageController && event.type == Mojo.Event.command ) {

			if( event.command === 'tpBackAction' ) {

				this.controller.stageController.popScene();

			} else if( event.command === 'preferences' ) {

				stageController.pushScene( "prefs" );
				event.stop();
			/*--------------------*/
			} else if( event.command === 'import' ) {

				stageController.pushScene( "import-data" );
				event.stop();
			} else if( event.command === 'export' ) {

				stageController.pushScene( "export-data" );
				event.stop();
			} else if( event.command === 'sync' ) {

				Mojo.Controller.errorDialog( "Sync data on device with server. Under Construction." );
				event.stop();
			/*--------------------*/
			} else if( event.command === 'reports' ) {

				stageController.pushScene( "report-system-category-pie" );
				//TODO stageController.pushScene( "report-system" );
				event.stop();
			} else if( event.command === 'budget' ) {

				stageController.pushScene( "transaction-plan" );
				event.stop();
			} else if( event.command === 'search' ) {

				stageController.pushScene( "search-transactions" );
				event.stop();
			/*--------------------*/
			} else if( event.command === 'help' ) {

				stageController.pushAppSupportInfoScene();
				//TODO change this to scene for better customization
				event.stop();
			} else if( event.command === 'about' ) {

				var currentScene = stageController.activeScene();

				var title = "<div class='center bold'>" + $L( "About Checkbook" ) + "</div>";
				var message = "<div class='left' style='padding-right:10px;'><img src='./images/icon_1.png' alt='' height='64' width='64' /></div>" +

								"<div class='left'>" +
									Mojo.Controller.appInfo.title + " - V" + Mojo.Controller.appInfo.version +
									"<br />" +
									Mojo.Controller.appInfo.vendor +
								"</div>" +

								"<div style='clear:both;' class='palm-info-text smaller center'>" +
									$L( "Copyright 2009 and forward" ) +
									"<br />" +
									"<a href='http://glitchtechscience.com?loc=" + Mojo.Locale.getCurrentLocale() + "'>" + Mojo.Controller.appInfo.vendor + "</a>" +
									"<br />" +
									$L( "All rights reserved" ) +
								"</div>" +

								"<div class='smaller'>" +
									$L( "If you would like to support continued development, you can <a href='https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=FQEWYTXEMFS3G&lc=US&item_name=GlitchTech&item_number=cbapp&currency_code=USD&bn=PP%2dDonationsBF%3abtn_donate_SM%2egif%3aNonHosted'>donate through PayPal</a>." ) +
								"</div>";

				currentScene.showAlertDialog(
						{
							onChoose: function( value ) {},
							title: title,
							message: message,
							allowHTMLMessage: true,
							choices:[
								{
									label: $L( "OK" ),
									value:""
								}
							]
						}
					);

				event.stop();
			}
		}
	}
});