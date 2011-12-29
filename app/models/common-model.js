/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

var commonModel = Class.create( repeatTrsnController, {

	initialize: function( $super ) {

		$super();
	},

	/** Loading Message System **/
	setupLoadingSystem: function() {

		var content = Mojo.View.render( { template: 'models/loading-view' } );
		this.controller.topContainer().innerHTML += content;

		this.controller.setupWidget(
					"system-progress",
					{},
					this.systemProgressBar = {
						value: 0
					}
				);

		//Progress Update
		this.controller.setupWidget(
					"system-spinner",
					{
						spinnerSize: Mojo.Widget.spinnerSmall,
						frameHeight: 'small'
					},
					this.systemSpinner = {
						spinning: false
					}
				);
	},

	systemActive: function() {

		try {

			return( this.systemSpinner['spinning'] === true );
		} catch( err ) {

			return false;
		}
	},

	updateLoadingSystem: function( visible, title, note, progress ) {

		if( visible === true ) {

			this.showLoadingSystem( title, note, progress );
		} else {

			this.hideLoadingSystem();
		}
	},

	showLoadingSystem: function( title, note, progress ) {

		this.controller.get( 'system-spinner' ).mojo.start();

		this.updateLoadingTitle( title );
		this.updateLoadingNote( note );
		this.updateProgressBar( progress );

		var scrim = this.controller.get( 'loading-scrim' );

		if( !this.systemActive() ) {
			//System is not running, show it

			Element.setOpacity( scrim, 0 );
			Element.show( scrim );

			Mojo.Animation.animateStyle(
					scrim,
					'opacity',
					'linear',
					{
						from: 1,
						to: 100,
						duration: 0.25,
						styleSetter: function( value ) {

							Element.setOpacity( scrim, value / 100 );
						}.bind( this )
					}
				);
		} else {

			Element.setOpacity( scrim, 1 );
			Element.show( scrim );
		}
	},

	showLoadingSystemNow: function( title, note, progress ) {

		this.controller.get( 'system-spinner' ).mojo.start();

		this.updateLoadingTitle( title );
		this.updateLoadingNote( note );
		this.updateProgressBar( progress );

		var scrim = this.controller.get( 'loading-scrim' );
		Element.setOpacity( scrim, 1 );
		Element.show( scrim );
	},

	hideLoadingSystem: function() {

		var scrim = this.controller.get( 'loading-scrim' );

		if( this.systemActive() ) {
			//System is currently running, hide it

			this.controller.get( 'system-spinner' ).mojo.stop();//want to stop only after hidden but causes bug

			Element.setOpacity( scrim, 1 );

			Mojo.Animation.animateStyle(
					scrim,
					'opacity',
					'linear',
					{
						from: 1,
						to: 100,
						duration: 0.25,
						styleSetter: function( value ) {

							Element.setOpacity( scrim, ( 100 - value ) / 100 );
						}.bind( this ),
						onComplete: function() {

							Element.hide( scrim );
						}.bind( this )
					}
				);
		} else {

			Element.hide( scrim );
		}
	},

	hideLoadingSystemNow: function() {

		var scrim = this.controller.get( 'loading-scrim' );

		Element.hide( scrim );
		Element.setOpacity( scrim, 0 );
	},

	hideLoadingSystemDelayed: function( pause ) {

		var hideSystem = function() {

				this.hideLoadingSystemNow();
			}.bind( this );

		var delayHideSystem = hideSystem.delay( pause );
	},

	updateLoadingTitle: function( title ) {

		this.controller.get( 'system-spinner-text' ).update( typeof( title ) === "undefined" ? $L( "Loading" ) : title );
	},

	updateLoadingNote: function( note ) {

		this.controller.get( 'system-spinner-note' ).update( typeof( note ) === "undefined" ? $L( "Please wait..." ) : note );
	},

	showProgressBar: function() {

		Element.show( this.controller.get( 'system-progress' ) );
	},

	updateProgressBar: function( progress ) {

		this.systemProgressBar['value'] = Number( typeof( progress ) === "undefined" ? 0 : progress );
		this.controller.modelChanged( this.systemProgressBar );
	},

	hideProgressBar: function() {

		Element.hide( this.controller.get( 'system-progress' ) );
	},

	showError: function() {

		Element.hide( this.controller.get( 'system-spinner' ) );
		Element.show( this.controller.get( 'system-error-icon' ) );
	},

	hideError: function() {

		Element.show( this.controller.get( 'system-spinner' ) );
		Element.hide( this.controller.get( 'system-error-icon' ) );
	}
});