/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

var AddEditTransactionCategoryDialog = Class.create( {

	initialize: function( sceneAssistant, i ) {

		this.sceneAssistant = sceneAssistant;
		this.controller = sceneAssistant.controller;

		if( typeof( i ) === "undefined" || i === "" || i < 0 ) {

			this.catId = -1;
			this.catIndex = -1;
			this.genCat = "";
			this.specCat = "";
		} else {

			this.catId = this.sceneAssistant.catData['items'][i]['specCatId'];
			this.catIndex = i;
			this.genCat = this.sceneAssistant.catData['items'][i]['genCat'];
			this.specCat = this.sceneAssistant.catData['items'][i]['specCat'];
		}

		this.submitTrsnCatEvent = this.submitTrsnCat.bindAsEventListener( this );
		this.keyUpHandler = this.keyUp.bindAsEventListener( this );

		this.autoSuggestPopup = null;

		this.catAutoSuggestDebounce = Mojo.Function.debounce( undefined, this.catAutoSuggest.bind( this ), 0.5 );
		this.catAutoSuggestDebounce = this.catAutoSuggestDebounce.bindAsEventListener( this );
	},

	setup: function( widget ) {

		this.widget = widget;

		//Need to change to a text box with auto-suggestion based on this.sceneAssistant.genCatData
		this.controller.setupWidget(
				"genCat",
				{
					property: "value",
					hintText: $L( "Required" ),
					focus: true,
					limitResize: true,
					maxLength: 35,
					changeOnKeyPress: true,
					textCase: Mojo.Widget.steModeTitleCase,
					changeOnKeyPress: true,
					enterSubmits: false,
					charsAllow: function( charCode ) {
						//Disallow | and ~

						return( charCode !== 124 && charCode !== 126 );
					}
				},
				this.genCatModel = {
					value: this.genCat,
					suggestedValue: ""
				}
			);

		this.controller.setupWidget(
				"specCat",
				{
					property: "value",
					hintText: $L( "Required" ),
					focus: false,
					limitResize: true,
					maxLength: 35,
					textCase: Mojo.Widget.steModeTitleCase,
					enterSubmits: true,
					charsAllow: function( charCode ) {
						//Disallow | and ~

						return( charCode !== 124 && charCode !== 126 );
					}
				},
				this.specCatModel = {
					value: this.specCat
				}
			);

		this.controller.setupWidget(
				"okButton",
				this.attributes = {},
				this.model = {
					buttonLabel: ( this.catId < 0 ? $L( "Create Category" ) : $L( "Save Category" ) ),
					disabled: false
				}
			);

		this.controller.get( "dialog-title" ).update( ( this.catId < 0 ? $L( "Create Transaction Category" ) : $L( "Edit Transaction Category" ) ) );
		this.controller.get( "main-label" ).update( $L( "Main" ) );
		this.controller.get( "secondary-label" ).update( $L( "Secondary" ) );
	},

	activate: function() {

		this.autoSuggestSelectionMade = false;

		Mojo.Event.listen( this.controller.get( 'okButton' ), Mojo.Event.tap, this.submitTrsnCatEvent );
		Mojo.Event.listen( this.controller.document, "keyup", this.keyUpHandler, true );
		Mojo.Event.listen( this.controller.get( 'genCat' ), Mojo.Event.propertyChange, this.catAutoSuggestDebounce );
	},

	keyUp: function( event ) {

		if( Mojo.Char.isEnterKey( event.keyCode ) && event.srcElement.parentElement.id === "specCat" ) {

			this.controller.get( 'specCat' ).mojo.blur();
			Mojo.Event.send( this.controller.get( 'okButton' ), Mojo.Event.tap, "" );
		}
	},

	catAutoSuggest: function( event ) {

		if( event.value.length >= 1 && event.value != event.oldValue &&
			event.value != this.genCatModel.suggestedValue &&
			this.sceneAssistant.genCatData.length > 0 ) {

			var suggestData = [];

			var oriValue = this.controller.get( 'genCat' ).mojo.getValue();

			suggestData.push(
					{
						label: oriValue,
						command: oriValue
					}
				);

			for( var i = 0; i < this.sceneAssistant.genCatData.length; i++ ) {

				var row = this.sceneAssistant.genCatData[i];

				if( row['value'].toUpperCase().indexOf( oriValue.toUpperCase() ) >= 0 && row['value'].toUpperCase() !== oriValue.toUpperCase() ) {

					suggestData.push(
							{
								label: row['value'],
								command: row['value']
							}
						);
				}
			}

			if( suggestData.length > 1 ) {

				this.autoSuggestPopup = this.controller.popupSubmenu(
						{
							onChoose: function( descValue ) {

								if( typeof( descValue ) !== "undefined" && descValue.length > 0 && descValue != "" ) {

									this.controller.get( 'genCat' ).mojo.setValue( descValue );
									this.genCatModel.value = descValue;
									this.genCatModel.suggestedValue = descValue;
								} else {

									this.genCatModel.suggestedValue = this.genCatModel.value;
								}
							}.bind( this ),
							scrimClass: "none",
							items: suggestData
						}
					);
			} else {

				try{

					this.autoSuggestPopup.mojo.close();
				} catch( err ) {}

				this.autoSuggestPopup = null;
			}
		} else {

			try{

				this.autoSuggestPopup.mojo.close();
			} catch( err ) {}

			this.autoSuggestPopup = null;
		}
	},

	submitTrsnCat: function( event ) {

		this.genCatModel.value = this.genCatModel.value.replace( "|", "" );
		this.specCatModel.value = this.specCatModel.value.replace( "|", "" );

		var matchFound = false;

		for( var i = 0; i < this.sceneAssistant.catData.length; i++ ) {

			if( this.sceneAssistant.catData['items'][i]['genCat'].toLowerCase() === this.genCatModel.value.toLowerCase() &&
				this.sceneAssistant.catData['items'][i]['genCat'].toLowerCase() !== this.genCat.toLowerCase() &&
				this.sceneAssistant.catData['items'][i]['specCat'].toLowerCase() === this.specCatModel.value.toLowerCase() &&
				this.sceneAssistant.catData['items'][i]['specCat'].toLowerCase() !== this.specCat.toLowerCase() ) {

				matchFound = true;

				i = this.sceneAssistant.catData.length;
				break;
			}
		}

		if( matchFound === false && this.genCatModel.value !== "" && this.specCatModel.value !== "" ) {

			if( this.catId < 0 ) {

				this.sceneAssistant.addTrsnCat( this.genCatModel.value, this.specCatModel.value );
			} else {

				this.sceneAssistant.editTrsnCat( this.catIndex, this.catId, this.genCatModel.value, this.specCatModel.value );
			}

			this.widget.mojo.close();
		} else if( this.genCatModel.value === "" || this.specCatModel.value === "" ) {

			Mojo.Controller.getAppController().showBanner( $L( "Categories may not be blank." ), "", "cbNotice" );
		} else if( matchFound !== false ) {

			Mojo.Controller.getAppController().showBanner( $L( "Categories must be unique." ), "", "cbNotice" );
		}
	},

	deactivate: function() {

		Mojo.Event.stopListening( this.controller.get( 'okButton' ), Mojo.Event.tap, this.submitTrsnCatEvent );
		Mojo.Event.stopListening( this.controller.document, "keyup", this.keyUpHandler, true );
		Mojo.Event.stopListening( this.controller.get( 'genCat' ), Mojo.Event.propertyChange, this.catAutoSuggestDebounce );
	},

	cleanup: function( event ) {
	}
} );