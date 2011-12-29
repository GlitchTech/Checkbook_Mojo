/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

var AddEditAccountCategoryDialog = Class.create( {

	initialize: function( sceneAssistant, i ) {

		this.sceneAssistant = sceneAssistant;
		this.controller = sceneAssistant.controller;

		if( typeof( i ) === "undefined" || i === "" || i < 0 ) {

			this.catId = 0;
			this.catIndex = -1;
			this.catName = "";
			this.catIcon = "cash_1.png";
			this.catColor = "green";
		} else {

			this.catId = this.sceneAssistant.acctCatData['items'][i]['rowId'];
			this.catIndex = i;
			this.catName = this.sceneAssistant.acctCatData['items'][i]['name'];
			this.catIcon = this.sceneAssistant.acctCatData['items'][i]['icon'];
			this.catColor = this.sceneAssistant.acctCatData['items'][i]['color'];
		}

		this.appIcons = [
							/*{//Reserved for recurring events
								label: "<img src='./images/calendar.png' height='32' width='32' />",
								value: "calendar.png"
							},*/ {
								label: "<img src='./images/cash_1.png' height='32' width='32' />",
								value: "cash_1.png"
							}, {
								label: "<img src='./images/cash_2.png' height='32' width='32' />",
								value: "cash_2.png"
							}, {
								label: "<img src='./images/cash_3.png' height='32' width='32' />",
								value: "cash_3.png"
							}, {
								label: "<img src='./images/cash_4.png' height='32' width='32' />",
								value: "cash_4.png"
							}, {
								label: "<img src='./images/cash_5.png' height='32' width='32' />",
								value: "cash_5.png"
							}, {
								label: "<img src='./images/checkbook_1.png' height='32' width='32' />",
								value: "checkbook_1.png"
							}, {
								label: "<img src='./images/checkbook_2.png' height='32' width='32' />",
								value: "checkbook_2.png"
							}, {
								label: "<img src='./images/coins_1.png' height='32' width='32' />",
								value: "coins_1.png"
							}, {
								label: "<img src='./images/coins_2.png' height='32' width='32' />",
								value: "coins_2.png"
							}, {
								label: "<img src='./images/coins_3.png' height='32' width='32' />",
								value: "coins_3.png"
							}, {
								label: "<img src='./images/coins_4.png' height='32' width='32' />",
								value: "coins_4.png"
							}, {
								label: "<img src='./images/credit_card_1.png' height='32' width='32' />",
								value: "credit_card_1.png"
							}, {
								label: "<img src='./images/credit_card_2.png' height='32' width='32' />",
								value: "credit_card_2.png"
							}, {
								label: "<img src='./images/credit_card_3.png' height='32' width='32' />",
								value: "credit_card_3.png"
							}, {
								label: "<img src='./images/dollar_sign_1.png' height='32' width='32' />",
								value: "dollar_sign_1.png"
							}, {
								label: "<img src='./images/dollar_sign_2.png' height='32' width='32' />",
								value: "dollar_sign_2.png"
							}, {
								label: "<img src='./images/dollar_sign_3.png' height='32' width='32' />",
								value: "dollar_sign_3.png"
							}, {
								label: "<img src='./images/echeck.png' height='32' width='32' />",
								value: "echeck.png"
							}, /*{//Reserved for recurring transfers
								label: "<img src='./images/future_transfer_1.png' height='32' width='32' />",
								value: "future_transfer_1.png"
							},*/ {
								label: "<img src='./images/icon_1.png' height='32' width='32' />",
								value: "icon_1.png"
							}, {
								label: "<img src='./images/icon_2.png' height='32' width='32' />",
								value: "icon_2.png"
							}, {
								label: "<img src='./images/icon_3.png' height='32' width='32' />",
								value: "icon_3.png"
							}, {
								label: "<img src='./images/icon_4.png' height='32' width='32' />",
								value: "icon_4.png"
							}, {
								label: "<img src='./images/jewel_1.png' height='32' width='32' />",
								value: "jewel_1.png"
							}, {
								label: "<img src='./images/jewel_2.png' height='32' width='32' />",
								value: "jewel_2.png"
							}, {
								label: "<img src='./images/money_bag_1.png' height='32' width='32' />",
								value: "money_bag_1.png"
							}, {
								label: "<img src='./images/money_bag_2.png' height='32' width='32' />",
								value: "money_bag_2.png"
							}, {
								label: "<img src='./images/money_bag_3.png' height='32' width='32' />",
								value: "money_bag_3.png"
							}, {
								label: "<img src='./images/money_bag_4.png' height='32' width='32' />",
								value: "money_bag_4.png"
							}, /*{//Reserved for locked accounts
								label: "<img src='./images/padlock_1.png' height='32' width='32' />",
								value: "padlock_1.png"
							},*/ {
								label: "<img src='./images/padlock_2.png' height='32' width='32' />",
								value: "padlock_2.png"
							}, {
								label: "<img src='./images/safe_1.png' height='32' width='32' />",
								value: "safe_1.png"
							}, {
								label: "<img src='./images/safe_2.png' height='32' width='32' />",
								value: "safe_2.png"
							}, {
								label: "<img src='./images/transfer_1.png' height='32' width='32' />",
								value: "transfer_1.png"
							}, {
								label: "<img src='./images/transfer_2.png' height='32' width='32' />",
								value: "transfer_2.png"
							}, /*{//Reserved for transfers
								label: "<img src='./images/transfer_3.png' height='32' width='32' />",
								value: "transfer_3.png"
							},*/ {
								label: "<img src='./images/transfer_4.png' height='32' width='32' />",
								value: "transfer_4.png"
							}
						];

		this.appColors = [
							{
								label: "<div style='width:100px;text-align:center;color:#ffffff;' class='custom-background green'>Green</div>",
								value: "green"
							}, {
								label: "<div style='width:100px;text-align:center;color:#ffffff;' class='custom-background blue'>Blue</div>",
								value: "blue"
							}, {
								label: "<div style='width:100px;text-align:center;color:#ffffff;' class='custom-background purple'>Purple</div>",
								value: "purple"
							}, {
								label: "<div style='width:100px;text-align:center;color:#ffffff;' class='custom-background red'>Red</div>",
								value: "red"
							}, {
								label: "<div style='width:100px;text-align:center;color:#ffffff;' class='custom-background yellow'>Gold</div>",
								value: "yellow"
							}, {
								label: "<div style='width:100px;text-align:center;color:#ffffff;' class='custom-background orange'>Orange</div>",
								value: "orange"
							}, {
								label: "<div style='width:100px;text-align:center;color:#ffffff;' class='custom-background black'>Black</div>",
								value: "black"
							}
						];

		this.submitAcctCatEvent = this.submitAcctCat.bindAsEventListener( this );

		this.keyUpHandler = this.keyUp.bindAsEventListener( this );
	},

	setup: function( widget ) {

		this.widget = widget;

		this.controller.setupWidget(
				"name",
				{
					property: "value",
					hintText: $L( "Required" ),
					focus: true,
					limitResize: true,
					maxLength: 25,
					textReplacement: false,
					enterSubmits: true
				},
				this.nameModel = { value: this.catName }
			);

		this.controller.setupWidget(
				"color",
				{
					label: $L( "Color" ),
					choices: this.appColors
				},
				this.colorModel = {
					value: this.catColor
				}
			);

		this.controller.setupWidget(
				"icon",
				{
					label: $L( "Icon" ),
					choices: this.appIcons
				},
				this.iconModel = {
					value: this.catIcon
				}
			);

		this.controller.setupWidget(
				"okButton",
				this.attributes = {},
				this.model = {
					buttonLabel: ( this.catId == 0 ? $L( "Create Category" ) : $L( "Save Category" ) ),
					buttonClass: "addAccountButton",
					disabled: false
				}
			);

		this.controller.get( 'acct-cat-dialog-title' ).update( $L( "Account Category" ) );
		this.controller.get( 'acct-cat-name-label' ).update( $L( "Category Name" ) );

		Mojo.Event.listen( this.controller.get( 'okButton' ), Mojo.Event.tap, this.submitAcctCatEvent );
		Mojo.Event.listen( this.controller.document, "keyup", this.keyUpHandler, true );
	},

	keyUp: function( event ) {

		if( Mojo.Char.isEnterKey( event.keyCode ) && event.srcElement.parentElement.id === "name" ) {

			this.controller.get( 'name' ).mojo.blur();
			Mojo.Event.send( this.controller.get( 'okButton' ), Mojo.Event.tap, "" );
		}
	},

	submitAcctCat: function( event ) {

		var matchFound = false;

		this.nameModel.value = this.nameModel.value.replace( "|", "" );

		for( var i = 0; i < this.sceneAssistant.acctCatData.length; i++ ) {

			if( this.sceneAssistant.acctCatData[i]['name'].toLowerCase() === this.nameModel.value.toLowerCase() &&
				this.nameModel.value.toLowerCase() !== this.catName.toLowerCase() ) {

				matchFound = true;
			}
		}

		if( matchFound === false && this.nameModel.value !== "" ) {

			if( this.catId != 0 ) {

				this.sceneAssistant.editAcctCat( this.catId, this.catIndex, this.catName, this.nameModel.value, this.iconModel.value, this.colorModel.value );
			} else {

				this.sceneAssistant.addAcctCat( this.nameModel.value, this.iconModel.value, this.colorModel.value );
			}

			this.widget.mojo.close();
		} else if( this.nameModel.value === "" ) {

			Mojo.Controller.getAppController().showBanner( $L( "Category names must not be blank." ), { source: 'notification' } );
		} else if( matchFound !== false ) {

			Mojo.Controller.getAppController().showBanner( $L( "Category names must be unique." ), { source: 'notification' } );
		}
	},

	cleanup: function( event ) {

		Mojo.Event.stopListening( this.controller.get( 'okButton' ), Mojo.Event.tap, this.submitAcctCatEvent );
		Mojo.Event.stopListening( this.controller.document, "keyup", this.keyUpHandler, true );
	}
} );
