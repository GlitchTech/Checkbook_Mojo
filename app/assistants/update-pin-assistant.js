/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

var updatePINDialog = Class.create( {

	initialize: function( sceneAssistant, callbackFunctionIn ) {

		this.sceneAssistant = sceneAssistant;
		this.controller = sceneAssistant.controller;
		this.callbackFunction = callbackFunctionIn;

		this.checkSaveCodeEvent = this.checkSaveCode.bindAsEventListener( this );
		this.cancelCodeChangeEvent = this.cancelCodeChange.bindAsEventListener( this );
	},

	/** Setup Display **/
	setup: function( widget ) {
		this.widget = widget;

		this.controller.setupWidget(
				"pinCode1",
				{//set disabled when drawer closed
					hintText: $L( "10 characters max" ),
					maxLength: 10,
					modifierState: Mojo.Widget.numLock,
					charsAllow: function( charCode ) {

						return( charCode >= 48 && charCode <= 57 );
					}
				},
				this.code1 = {
					value: ""
				}
			);

		this.controller.setupWidget(
				"pinCode2",
				{//set disabled when drawer closed
					hintText: $L( "10 characters max" ),
					maxLength: 10,
					modifierState: Mojo.Widget.numLock,
					charsAllow: function( charCode ) {

						return( charCode >= 48 && charCode <= 57 );
					}
				},
				this.code2 = {
					value: ""
				}
			);

		this.controller.setupWidget(
					"okButton",
					{},
					{
						label: $L( 'Confirm' ),
						buttonClass: "affirmative",
						disabled: false
					}
				);

		this.controller.setupWidget(
					"cancelButton",
					{},
					{
						label: $L( "Cancel" ),
						buttonClass: "negative",
						disabled: false
					}
				);

		Mojo.Event.listen( this.controller.get( 'okButton' ), Mojo.Event.tap, this.checkSaveCodeEvent );
		Mojo.Event.listen( this.controller.get( 'cancelButton' ), Mojo.Event.tap, this.cancelCodeChangeEvent );

		this.controller.get( 'pin-title' ).update( $L( "Change PIN Code" ) );
		this.controller.get( 'pin-code-label-1' ).update( $L( "PIN Code" ) );
		this.controller.get( 'pin-code-label-2' ).update( $L( "Confirm" ) );
		this.controller.get( 'pin-note' ).update( $L( "You pin may only contain numeric charactes. (0-9)" ) );
	},

	checkSaveCode: function() {

		//only successfully exits when pins match and person taps save
		if( this.code1.value === this.code2.value && this.code1.value !== "" ) {

			this.callbackFunction( this.code1.value );

			this.widget.mojo.close();
		} else if( this.code1.value === "" ) {

			Element.show( this.controller.get( 'errorMessageContainer' ) );
			this.controller.get( 'errorMessage' ).update( $L( "The code entered is invalid." ) );
		} else {

			Element.show( this.controller.get( 'errorMessageContainer' ) );
			this.controller.get( 'errorMessage' ).update( $L( "The codes entered did not match." ) );
		}
	},

	cancelCodeChange: function() {

		this.widget.mojo.close();
	},

	cleanup: function( event ) {

		Mojo.Event.stopListening( this.controller.get( 'okButton' ), Mojo.Event.tap, this.checkSaveCodeEvent );
		Mojo.Event.stopListening( this.controller.get( 'cancelButton' ), Mojo.Event.tap, this.cancelCodeChangeEvent );
	}
} );
