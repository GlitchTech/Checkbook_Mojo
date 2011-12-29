/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

var LoginAssistant = Class.create( {

	initialize: function( nextSceneIn, codeIn, nextActionIn ) {

		this.nextScene = nextSceneIn;
		this.pinCode = codeIn;
		this.nextAction = nextActionIn;

		this.argv = arguments;

		this.checkPasswordEvent = this.checkPassword.bindAsEventListener( this );
		this.numpadPressedEvent = this.numpadPressed.bindAsEventListener( this );
		this.keyUpHandler = this.keyUp.bindAsEventListener( this );
	},

	setup: function() {

		this.enteredPin = "";
		this.errorCount = 0;

		this.correctPin = 0;

		this.controller.setupWidget(
				"pinCode",
				{
					maxLength: 10,
					modifierState: Mojo.Widget.numLock,
					charsAllow: function( charCode ) {

						return( ( charCode >= 48 && charCode <= 57 ) || charCode == 13 );
					},
					focusMode: Mojo.Widget.focusSelectMode
				},
				this.code = {
					value: ""
				}
			);

		this.controller.setupWidget(
					"okButton",
					{},
					{
						buttonLabel: $L( "Okay" ),
						disabled: false
					}
				);

		var sceneMenuModel = {
							visible: true,
							items: [
								Mojo.Menu.editItem,
								appMenuPrefAccountsDisabled,
								appMenuFeaturesDisabled,
								cbAboutItem,
								cbHelpItem
							]
						};

		this.controller.setupWidget( Mojo.Menu.appMenu, appMenuOptions, sceneMenuModel );
	},

	ready: function() {

		if( this.nextScene === "accounts" ) {

			this.controller.get( 'description' ).update( $L( "Enter <strong>Main Program</strong> PIN Code" ) );
		} else {

			this.controller.get( 'description' ).update( $L( "Enter <strong>Selected Account</strong> PIN Code" ) );
		}

		this.controller.get( 'pin-code-label' ).update( $L( "PIN Code" ) );
	},

	//500ms before activate
	aboutToActivate: function() {
	},

	//Scene made visible
	activate: function( event ) {

		Mojo.Event.listen( this.controller.get( 'okButton' ), Mojo.Event.tap, this.checkPasswordEvent );

		Mojo.Event.listen( this.controller.get( 'np1' ), Mojo.Event.tap, this.numpadPressedEvent );
		Mojo.Event.listen( this.controller.get( 'np2' ), Mojo.Event.tap, this.numpadPressedEvent );
		Mojo.Event.listen( this.controller.get( 'np3' ), Mojo.Event.tap, this.numpadPressedEvent );
		Mojo.Event.listen( this.controller.get( 'np4' ), Mojo.Event.tap, this.numpadPressedEvent );
		Mojo.Event.listen( this.controller.get( 'np5' ), Mojo.Event.tap, this.numpadPressedEvent );
		Mojo.Event.listen( this.controller.get( 'np6' ), Mojo.Event.tap, this.numpadPressedEvent );
		Mojo.Event.listen( this.controller.get( 'np7' ), Mojo.Event.tap, this.numpadPressedEvent );
		Mojo.Event.listen( this.controller.get( 'np8' ), Mojo.Event.tap, this.numpadPressedEvent );
		Mojo.Event.listen( this.controller.get( 'np9' ), Mojo.Event.tap, this.numpadPressedEvent );
		Mojo.Event.listen( this.controller.get( 'np0' ), Mojo.Event.tap, this.numpadPressedEvent );
		Mojo.Event.listen( this.controller.get( 'npb' ), Mojo.Event.tap, this.numpadPressedEvent );

		Mojo.Event.listen( this.controller.document, "keyup", this.keyUpHandler, true );
	},

	numpadPressed: function( event ) {

		if( this.code.value.length < 10 ) {

			switch( event.target.id ) {
				case 'np0':
					this.code.value += '0';
					break;
				case 'np1':
					this.code.value += '1';
					break;
				case 'np2':
					this.code.value += '2';
					break;
				case 'np3':
					this.code.value += '3';
					break;
				case 'np4':
					this.code.value += '4';
					break;
				case 'np5':
					this.code.value += '5';
					break;
				case 'np6':
					this.code.value += '6';
					break;
				case 'np7':
					this.code.value += '7';
					break;
				case 'np8':
					this.code.value += '8';
					break;
				case 'np9':
					this.code.value += '9';
					break;
			}
		}

		if( event.target.id === 'npb' ) {

			this.code.value = "";
		}

		this.controller.modelChanged( this.code );
	},

	keyUp: function( event ) {

		if( Mojo.Char.isEnterKey( event.keyCode ) && event.srcElement.parentElement.id === "pinCode" ) {

			this.controller.get( 'pinCode' ).mojo.blur();
			Mojo.Event.send( this.controller.get( 'okButton' ), Mojo.Event.tap, "" );
		}
	},

	checkPassword: function() {
		//Fetch Spike

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( "SELECT spike FROM prefs LIMIT 1;", [], this.checkPasswordHandler.bind( this ), this.qrySpikeError.bind( this ) );
				}
			).bind( this ) );
	},

	qrySpikeError: function( transaction, error ) {

		var errorMessage = " || SQL Error: " + arguments[arguments.length - 1].message +
								" (Code " + arguments[arguments.length - 1].code + ")" +
								" || Fetching Spike";

		systemError( errorMessage );
	},

	checkPasswordHandler: function( transaction, results ) {

		var row = results.rows.item( 0 );

		if( Mojo.Model.decrypt( row['spike'], this.pinCode ) != this.code.value ) {

			this.errorCount++;

			Element.show( this.controller.get( 'errorMessageContainer' ) );
			this.controller.get( 'errorMessage' ).update( $L( "Try again." ) + "<br />" + this.errorCount + $L( " out of 5 attempts used." ) );

			this.controller.get( 'pinCode' ).mojo.setValue( "" );
			this.code.value = "";

			this.controller.get( 'pinCode' ).mojo.focus();

			if( this.errorCount >= 5 ) {

				this.correctPin = 2;

				switch( this.nextAction ) {
					case 'close':
						Mojo.Controller.getAppController().closeAllStages();
						break;
					case 'back':
						this.controller.stageController.popScene();
						break;
				}
			}
		} else {

			this.correctPin = 1;

			//Start main scene
			if( this.nextScene === "addEdit-account" ) {

				this.controller.stageController.swapScene( this.nextScene, this.argv[3] );
			} else if( typeof( this.nextScene['name'] ) !== "undefined" && this.nextScene['name'] === "transactions" ) {

				this.controller.stageController.swapScene( this.nextScene, this.argv[3], this.argv[4] );
			} else {

				this.controller.stageController.swapScene( this.nextScene );
			}
		}
	},

	deactivate: function( event ) {

		Mojo.Event.stopListening( this.controller.get( 'okButton' ), Mojo.Event.tap, this.checkPasswordEvent );

		Mojo.Event.stopListening( this.controller.get( 'np1' ), Mojo.Event.tap, this.numpadPressedEvent );
		Mojo.Event.stopListening( this.controller.get( 'np2' ), Mojo.Event.tap, this.numpadPressedEvent );
		Mojo.Event.stopListening( this.controller.get( 'np3' ), Mojo.Event.tap, this.numpadPressedEvent );
		Mojo.Event.stopListening( this.controller.get( 'np4' ), Mojo.Event.tap, this.numpadPressedEvent );
		Mojo.Event.stopListening( this.controller.get( 'np5' ), Mojo.Event.tap, this.numpadPressedEvent );
		Mojo.Event.stopListening( this.controller.get( 'np6' ), Mojo.Event.tap, this.numpadPressedEvent );
		Mojo.Event.stopListening( this.controller.get( 'np7' ), Mojo.Event.tap, this.numpadPressedEvent );
		Mojo.Event.stopListening( this.controller.get( 'np8' ), Mojo.Event.tap, this.numpadPressedEvent );
		Mojo.Event.stopListening( this.controller.get( 'np9' ), Mojo.Event.tap, this.numpadPressedEvent );
		Mojo.Event.stopListening( this.controller.get( 'np0' ), Mojo.Event.tap, this.numpadPressedEvent );
		Mojo.Event.stopListening( this.controller.get( 'npb' ), Mojo.Event.tap, this.numpadPressedEvent );

		Mojo.Event.stopListening( this.controller.document, "keyup", this.keyUpHandler, true );
	},

	cleanup: function( event ) {

		if( this.correctPin === 0 ) {

			switch( this.nextAction ) {
				case 'close':
					Mojo.Controller.getAppController().closeAllStages();
					break;
			}
		}
	}
} );
