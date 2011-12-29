/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

var GtsConnectAssistant = Class.create( commonModel, {

	initialize: function( $super ) {

		$super();

		//controls the log in creds
		//shows last sync
		//option for sync now
		//option for sync frequency (requires making Checkbook runnable as a service)
	},

	setup: function() {

		this.setupLoadingSystem();
		//this.updateLoadingSystem( true, $L( "TITLE_TEXT" ), $L( "NOTE_TEXT" ), 0 );
	},

	ready: function() {
	},

	//500ms before activate
	aboutToActivate: function() {
	},

	//Scene made visible
	activate: function() {
	},

	deactivate: function() {
	},

	cleanup: function() {
	}
} );