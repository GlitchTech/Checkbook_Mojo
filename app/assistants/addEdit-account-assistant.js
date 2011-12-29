/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

var AddEditAccountAssistant = Class.create( commonModel, {

	initialize: function( $super, acctObj ) {

		$super();

		this.pinSet = false;

		if( typeof( acctObj ) === "undefined" ) {
			//add

			this.index = -1;

			this.accountName = "";
			this.accountDesc = "";
			this.accountCat = "";
			this.categoryIcon = "";
			this.accountId = -1;

			this.accountSort = "1";
			this.accountHidden = "0";
			this.accountFrozen = "0";
			this.accountLocked = "0";
			this.accountLockedCode = "";

			this.defaultAccount = 0;

			this.acct_bal_view = "0";

			this.transDescMultiLine = "0";
			this.showTransTime = "0";
			this.useAutoComplete = "1";
			this.atmEntry = "0";
			this.autoSavings = 0;
			this.autoSavingsLink = -1;

			this.hide_cleared = 0;

			this.hideNotes = "0";
			this.enableCategories = "1";
			this.checkField = "0";

			this.runningBalance = "0";
		} else {
			//edit

			this.accountId = parseInt( acctObj['rowId'] );

			this.index = acctObj['index'];

			this.accountName = acctObj['name'];
			this.accountDesc = acctObj['description'];
			this.accountCat = acctObj['category'];
			this.categoryIcon = acctObj['categoryIcon'];

			this.accountSort = acctObj['sort'];
			this.accountHidden = acctObj['hidden'];
			this.accountFrozen = acctObj['frozen'];
			this.accountLocked = acctObj['locked'];

			this.defaultAccount = acctObj['defaultAccount'];

			this.acct_bal_view = acctObj['bal_view'];

			if( this.accountLocked == 0 ) {

				this.accountLockedCode = "";
			} else {

				this.accountLockedCode = acctObj['lockedCode'];
				this.pinSet = true;
			}

			this.transDescMultiLine = acctObj['transDescMultiLine'];
			this.showTransTime = acctObj['showTransTime'];
			this.useAutoComplete = acctObj['useAutoComplete'];
			this.atmEntry = acctObj['atmEntry'];
			this.autoSavings = acctObj['autoSavings'];
			this.autoSavingsLink = acctObj['autoSavingsLink'];

			this.hide_cleared = acctObj['hide_cleared'];

			this.hideNotes = acctObj['hideNotes'];
			this.enableCategories = acctObj['enableCategories'];
			this.checkField = acctObj['checkField'];

			this.runningBalance = acctObj['runningBalance'];
		}

		this.selectCategoryEvent = this.selectCategory.bindAsEventListener( this );

		this.updateSortPreviewEvent = this.updateSortPreview.bindAsEventListener( this );
		this.updateHiddenPreviewEvent = this.updateHiddenPreview.bindAsEventListener( this );
		this.updateBalancePreviewEvent = this.updateBalancePreview.bindAsEventListener( this );
		this.secureCodeHandlerEvent = this.secureCodeHandler.bindAsEventListener( this );
		this.pinCodeTapEvent = this.pinCodeTap.bindAsEventListener( this );

		this.toggleDisplayOptionsDrawerEvent = this.toggleDisplayOptionsDrawer.bindAsEventListener( this );
		this.toggleAcctOptionsDrawerEvent = this.toggleAcctOptionsDrawer.bindAsEventListener( this );
		this.toggleTransactionOptionsDrawerEvent = this.toggleTransactionOptionsDrawer.bindAsEventListener( this );

		this.autoSavingsHandlerEvent = this.autoSavingsHandler.bindAsEventListener( this );
		this.autoSavingsLinkHandlerEvent = this.autoSavingsLinkHandler.bindAsEventListener( this );
	},

	/** Setup Display **/
	setup : function() {

		//Pull from DB
		this.accountTypes = [];

		this.controller.setupWidget(
				"accountName",
				this.nameAttributes = {
					property: "value",
					hintText: $L( "Account Name" ),
					limitResize: true,
					maxLength: 50,
					enterSubmits: false
				},
				this.nameModel = { value : this.accountName }
			);

		this.controller.setupWidget(
				"accountDescription",
				this.descAttributes = {
					property: "value",
					hintText: $L( "Comments or Notes" ),
					multiline: true,
					enterSubmits: false
				},
				this.descModel = { value : this.accountDesc }
			);

		this.controller.setupWidget(
				"acctOptionsDrawer",
				{
					unstyled: true
				},
				this.acctOptionsDrawer = {
					open: false
				}
			);

		/** Begin Account Options Drawer **/
		this.controller.setupWidget(
				"frozen",
				{
					trueValue: "1",
					falseValue: "0"
				},
				this.frozenModel = {
					value: this.accountFrozen
				}
			);

		this.controller.setupWidget(
				"locked",
				{
					trueValue: "1",
					falseValue: "0"
				},
				this.lockedModel = {
					value: this.accountLocked
				}
			);

		this.controller.setupWidget(
				"lockedCodeDrawer",
				{
					//unstyled: true
				},
				this.lockedCodeDrawer = {
					open: ( this.accountLocked == 1 ? true : false )
				}
			);

		this.controller.setupWidget(
				"lockedCode",
				{
					hintText: $L( "Tap to set..." )
				},
				this.lockedCodeModel = {
					disabled: true,
					value: ( this.accountLocked == 1 ? this.accountLockedCode : "" )
				}
			);
		/** End Account Options Drawer **/

		this.controller.setupWidget(
				"displayOptionsDrawer",
				{
					unstyled: true
				},
				this.displayOptionsDrawer = {
					open: false
				}
			);

		/** Begin Display Options Drawer **/
		this.controller.setupWidget(
				"sorting",
				{
					label: $L( "Sorting" )
				},
				this.sortModel = {
					value: this.accountSort,
					disabled: false,
					choices: []
				}
			);

		this.controller.setupWidget(
				"hidden",
				{
					label: $L( "Display" ),
					choices: [
						{
							label: $L( "Show Account" ),
							value: "0"
						}, {
							label: $L( "Mask Account" ),
							value: "1"
						}, {
							label: $L( "Hide Account" ),
							value: "2"
						}
					]
				},
				this.hiddenModel = {
					value: this.accountHidden
				}
			);

		this.controller.setupWidget(
				"defaultAccount",
				{//Attributes
					trueValue: 1,
					falseValue: 0
				},
				this.defaultAccountModel = {
					value: this.defaultAccount
				}
			);

		this.controller.setupWidget(
				"bal_view",
				{
					label: $L( "Balance" ),
					choices: [
						{
							label: $L( "Available" ),
							value: "0"
						}, {
							label: $L( "Cleared" ),
							value: "1"
						}, {
							label: $L( "Pending" ),
							value: "3"
						}, {
							label: $L( "Final" ),
							value: "2"
						}
					]
				},
				this.balanceModel = {
					value: this.acct_bal_view
				}
			);

		this.controller.setupWidget(
				"showTransTime",
				{//Attributes
					trueValue: "1",
					falseValue: "0"
				},
				this.showTransTimeModel = {
					value: this.showTransTime
				}
			);

		this.controller.setupWidget(
				"runningBalance",
				{//Attributes
					trueValue: "1",
					falseValue: "0"
				},
				this.runningBalanceModel = {
					value: this.runningBalance
				}
			);

		this.controller.setupWidget(
				"hideNotes",
				{//Attributes
					trueValue: "1",
					falseValue: "0"
				},
				this.hideNotesModel = {
					value: this.hideNotes
				}
			);

		this.controller.setupWidget(//STYLE SET display: none
				"hide_cleared",
				{//Attributes
					trueValue: "1",
					falseValue: "0"
				},
				this.hideClearedModel = {
					value: this.hide_cleared
				}
			);
		/** End Display Options Drawer **/

		this.controller.setupWidget(
				"transacitonOptionsDrawer",
				{
					unstyled: true
				},
				this.transacitonOptionsDrawer = {
					open: false
				}
			);

		/** Begin Transaction Options Drawer **/
		this.controller.setupWidget(
				"transDescMultiLine",
				{//Attributes
					trueValue: "1",
					falseValue: "0"
				},
				this.transDescMultiLineModel = {
					value: this.transDescMultiLine
				}
			);

		this.controller.setupWidget(
				"useAutoComplete",
				{//Attributes
					trueValue: "1",
					falseValue: "0"
				},
				this.useAutoCompleteModel = {
					value: this.useAutoComplete
				}
			);

		this.controller.setupWidget(
				"atmEntry",
				{//Attributes
					trueValue: "1",
					falseValue: "0"
				},
				this.atmEntryModel = {
					value: this.atmEntry
				}
			);

		this.controller.setupWidget(
				"autoSavings",
				{
					label: $L( "Auto Transfer" ),
					choices: [
						{
							label: $L( "Do not transfer" ),
							value: 0
						}, {
							label: $L( "Transfer remainder" ),
							value: 1
						}
					]
				},
				this.autoSavingsModel = {
					value: this.autoSavings
				}
			);

		this.controller.setupWidget(
				"autoSavingsLinkDrawer",
				{
					//unstyled: true
				},
				this.autoSavingsLinkDrawer = {
					open: ( this.autoSavingsModel['value'] === 1 ? true : false )
				}
			);

		this.controller.setupWidget(
				"checkField",
				{
					trueValue: "1",
					falseValue: "0"
				},
				this.checkFieldModel = {
					value: this.checkField
				}
			);

		this.controller.setupWidget(
				"enableCategories",
				{
					trueValue: "1",
					falseValue: "0"
				},
				this.enableCategoriesModel = {
					value: this.enableCategories
				}
			);
		/** End Transaction Options Drawer **/

		this.addAccountButton = {
					visible: true,
					items: [
						{
							label: $L( 'Done' ),
							command:'saveAccount'
						}, {
							label: $L( 'Cancel' ),
							command:'noAccount'
						}
					]
				};

		this.controller.setupWidget( Mojo.Menu.commandMenu, undefined, this.addAccountButton );

		var transactionMenuModel = {
							visible: true,
							items: [
								Mojo.Menu.editItem,
								appMenuPrefAccountsDisabled,
								appMenuFeaturesDisabled,
								{
									label: $L( "Delete Account" ),
									command: "delete"
								},
								cbAboutItem,
								cbHelpItem
							]
						};

		this.controller.setupWidget( Mojo.Menu.appMenu, appMenuOptions, transactionMenuModel );

		this.setupLoadingSystem();
		this.fetchTrsnSortMethods();
	},

	ready: function() {

		this.controller.get( 'categoryRowLabel' ).update( $L( "Category" ) );

		this.controller.get( 'security-options-label' ).update( $L( "Security Options" ) );
		this.controller.get( 'freeze-internal-label' ).update( $L( "Freeze Internal Transactions" ) );
		this.controller.get( 'freeze-internal-preview' ).update( $L( "Prevent any changes from being made only in this account." ) );
		this.controller.get( 'add-security-label' ).update( $L( "PIN Lock" ) );
		this.controller.get( 'security-code-label' ).update( $L( "Code" ) );

		this.controller.get( 'display-options-label' ).update( $L( "Display Options" ) );
		this.controller.get( 'default-account-label' ).update( $L( "Default Account" ) );
		this.controller.get( 'default-account-preview' ).update( $L( "This account is launched automatically on start." ) );
		this.controller.get( 'show-transaction-time-label' ).update( $L( "Show Transaction Time" ) );
		this.controller.get( 'show-transaction-time-preview' ).update( $L( "Displays the transaction time." ) );
		this.controller.get( 'running-balance-label' ).update( $L( "Show Running Balance" ) );
		this.controller.get( 'running-balance-preview' ).update( $L( "Running balance will be shown beneath transaction amount. The transaction amount will be black and the balance will be colored." ) );
		this.controller.get( 'hide-trsn-notes-label' ).update( $L( "Hide Transaction Notes" ) );
		this.controller.get( 'hide-trsn-notes-preview' ).update( $L( "Transaction notes will be hidden." ) );
		this.controller.get( 'hide-cleared-label' ).update( $L( "Hide Cleared Transactions" ) );
		this.controller.get( 'hide-cleared-preview' ).update( $L( "Cleared transactions will be hidden." ) );

		this.controller.get( 'transaction-options-label' ).update( $L( "Transaction Options" ) );
		this.controller.get( 'trsn-desc-label' ).update( $L( "Description Multiline Mode" ) );
		this.controller.get( 'trsn-desc-preview' ).update( $L( "Allows the transaction description to take up multiple lines in the add/edit transaction screen." ) );
		this.controller.get( 'auto-complete-label' ).update( $L( "Use Auto-Complete" ) );
		this.controller.get( 'auto-complete-preview' ).update( $L( "Displays suggestions for transaction descriptions based on your history." ) );
		this.controller.get( 'atm-mode-label' ).update( $L( "Use ATM Mode" ) );
		this.controller.get( 'atm-mode-preview' ).update( $L( "Amount field will be automatically formatted as you type." ) );
		this.controller.get( 'check-num-field-label' ).update( $L( "Add Check Number Field" ) );
		this.controller.get( 'check-num-field-preview' ).update( $L( "Add a field to record the check number in the add/edit transaction screen." ) );
		this.controller.get( 'expense-category-label' ).update( $L( "Add Expense Categories" ) );
		this.controller.get( 'expense-category-preview' ).update( $L( "Add a field to record the expense category in the add/edit transaction screen." ) );

		this.controller.get( 'autoSavingsLink-label' ).update( $L( "Transfer to..." ) );
	},

	//500ms before activate
	aboutToActivate: function() {

		this.hideLoadingSystemNow();

		this.fetchCategories();
		this.updateSortPreview();
		this.updateHiddenPreview();
		this.updateBalancePreview();
		this.updateAutoSavingsPreview();
		this.updateAutoSavingsAcct();

		if( ( this.index === -1 && accounts_obj['popup'].length <= 0 ) || ( this.index !== -1 && accounts_obj['popup'].length <= 1 ) ) {
			//Creating/Editing only account

			this.autoSavingsModel['disabled'] = true;
		} else {

			this.autoSavingsModel['disabled'] = false;
		}

		this.controller.modelChanged( this.autoSavingsModel );
	},

	//Scene made visible
	activate: function( event ) {

		Mojo.Event.listen( this.controller.get( 'locked' ), Mojo.Event.propertyChange, this.secureCodeHandlerEvent );
		Mojo.Event.listen( this.controller.get( 'lockedCode' ), Mojo.Event.tap, this.pinCodeTapEvent );

		Mojo.Event.listen( this.controller.get( 'displayOptionsToggle' ), Mojo.Event.tap, this.toggleDisplayOptionsDrawerEvent );//Drawer
		Mojo.Event.listen( this.controller.get( 'categoryRow' ), Mojo.Event.tap, this.selectCategoryEvent );
		Mojo.Event.listen( this.controller.get( 'sorting' ), Mojo.Event.propertyChange, this.updateSortPreviewEvent );

		Mojo.Event.listen( this.controller.get( 'acctOptionsToggle' ), Mojo.Event.tap, this.toggleAcctOptionsDrawerEvent );//Drawer
		Mojo.Event.listen( this.controller.get( 'hidden' ), Mojo.Event.propertyChange, this.updateHiddenPreviewEvent );
		Mojo.Event.listen( this.controller.get( 'bal_view' ), Mojo.Event.propertyChange, this.updateBalancePreviewEvent );

		Mojo.Event.listen( this.controller.get( 'transacitonOptionsToggle' ), Mojo.Event.tap, this.toggleTransactionOptionsDrawerEvent );//Drawer
		Mojo.Event.listen( this.controller.get( 'autoSavings' ), Mojo.Event.propertyChange, this.autoSavingsHandlerEvent );
		Mojo.Event.listen( this.controller.get( 'autoSavingsLink-row' ), Mojo.Event.tap, this.autoSavingsLinkHandlerEvent );
	},

	fetchTrsnSortMethods: function() {

		accountsDB.transaction(
			(
				function( transaction ) {

					var sortQry = "SELECT sortId, sortGroup, label, desc FROM acctTrsnSortOptn ORDER BY groupOrder ASC, label;";

					transaction.executeSql(
							sortQry,
							[],
							this.fetchTrsnSortMethodsHandler.bind( this ),
							this.sqlError.bind( this, "Add/Edit Acct - fetchTrsnSortMethods" )
					);
				}
			).bind( this ) );
	},

	fetchTrsnSortMethodsHandler: function( transaction, results ) {

		this.sortModel['choices'].length = 0;

		var offset = 0;
		var currGroup = "";

		for( var i = 0; i < results.rows.length; i++ ) {

			var row = results.rows.item( i );

			if( currGroup !== row['sortGroup'] ) {

				currGroup = row['sortGroup'];

				this.sortModel['choices'][i + offset] = {
					label: $L( currGroup )
				};
				offset++;
			}

			this.sortModel['choices'][i + offset] = {
				label: $L( row['label'] ),
				value: row['sortId']
			};
		}

		this.controller.modelChanged( this.sortModel );
	},

	updateSortPreview: function() {

		accountsDB.transaction(
			(
				function( transaction ) {

					var sortQry = "SELECT desc FROM acctTrsnSortOptn WHERE sortId = ?;";

					transaction.executeSql(
							sortQry,
							[ this.sortModel.value ],
							this.updateSortPreviewHandler.bind( this ),
							this.sqlError.bind( this, "Add/Edit Acct - updateSortPreview" )
					);
				}
			).bind( this ) );
	},

	updateSortPreviewHandler: function( transaction, results ) {

		for( var i = 0; i < results.rows.length; i++ ) {

			var row = results.rows.item( i );

			this.controller.get( "sortingPreview" ).update( $L( row['desc'] ) );
		}
	},

	updateHiddenPreview: function() {

		if( this.hiddenModel.value == "0" ) {

			this.controller.get( "hiddenPreview" ).update( $L( "Account is visible." ) );
		} else if( this.hiddenModel.value == "1" ) {

			this.controller.get( "hiddenPreview" ).update( $L( "Account is visible, but removed from total balance calculations." ) );
		} else if( this.hiddenModel.value == "2" ) {

			this.controller.get( "hiddenPreview" ).update( $L( "Account is hidden and removed from total balance calculations. Account can still be accessed via Preferences." ) );
		}
	},

	updateBalancePreview: function() {

		if( this.balanceModel.value == "0" ) {

			this.controller.get( "bal_viewPreview" ).update( $L( "Includes all transactions up to current date/time." ) );

		} else if( this.balanceModel.value == "1" ) {

			this.controller.get( "bal_viewPreview" ).update( $L( "Includes all cleared transactions up to current date/time." ) );

		} else if( this.balanceModel.value == "2" ) {

			this.controller.get( "bal_viewPreview" ).update( $L( "Includes all transactions." ) );
		} else if( this.balanceModel.value == "3" ) {

			this.controller.get( "bal_viewPreview" ).update( $L( "Includes all pending transactions." ) );
		}
	},

	updateAutoSavingsPreview: function() {

		if( ( this.index === -1 && accounts_obj['popup'].length <= 0 ) || ( this.index !== -1 && accounts_obj['popup'].length <= 1 ) ) {

			this.controller.get( "autoSavings-preview" ).update( $L( "Multiple accounts required before this feature can be set up." ) );
		} else {

			if( this.autoSavingsModel.value === 0 ) {

				this.controller.get( "autoSavings-preview" ).update( $L( "Do not transfer anything after a purchase." ) );
			} else if( this.autoSavingsModel.value === 1 ) {

				this.controller.get( "autoSavings-preview" ).update( $L( "Round up all purchases to the nearest dollar amount, and transfer the difference from this account to another. (Able to be disabled on a per transaction basis)" ) );
			} else {

				this.controller.get( "autoSavings-preview" ).update( "" );
			}
		}
	},

	updateAutoSavingsAcct: function() {

		if( this.autoSavingsModel.value >= 1 ) {

			var acctName = this.getAccountName( this.autoSavingsLink );

			if( !isNaN( this.autoSavingsLink ) && this.autoSavingsLink >= 0 && acctName.length > 0 ) {

				this.controller.get( 'autoSavingsLink' ).update( this.getAccountImage( this.autoSavingsLink ) + this.getAccountName( this.autoSavingsLink ) );
			} else {

				this.controller.get( 'autoSavingsLink' ).update( $L( "Please choose one." ) );
			}
		} else {

			this.controller.get( 'autoSavingsLink' ).update( "" );
		}
	},

	autoSavingsHandler: function() {

		this.updateAutoSavingsPreview();
		this.updateAutoSavingsAcct();

		if( this.autoSavingsModel.value >= 1 ) {

			this.controller.get( "autoSavingsLinkDrawer" ).mojo.setOpenState( true );
		} else {

			this.controller.get( "autoSavingsLinkDrawer" ).mojo.setOpenState( false );
		}
	},

	autoSavingsLinkHandler: function( event ) {

		event.stop();

	    this.controller.popupSubmenu(
				{
					onChoose: this.autoSavingsLinkChoose.bind( this ),
					toggleCmd: this.autoSavingsLink,
					items: accounts_obj['popup']
				}
			);
	},

	autoSavingsLinkChoose: function( value ) {

		if( typeof( value ) !== "undefined" && value.length > 0 && value != "" ) {

			this.autoSavingsLink = value;
			this.updateAutoSavingsAcct();
		}
	},

	secureCodeHandler: function() {

		this.controller.get( "lockedCodeDrawer" ).mojo.toggleState();

		if( this.controller.get( "lockedCodeDrawer" ).mojo.getOpenState() !== true ) {

			this.lockedCodeModel['value'] = "";
		}

		this.controller.modelChanged( this.lockedCodeModel );
	},

	pinCodeTap: function( event ) {

		event.stop();

		this.controller.showDialog(
				{
					template: 'dialogs/updatePIN-dialog',
					assistant: new updatePINDialog( this, this.pinCodeHandler.bind( this ) )
				}
			);

		//Scroll to top
		this.controller.getSceneScroller().mojo.revealTop( 0 );
	},

	pinCodeHandler: function( newCode ) {

		//Confirm use code set and code is valid
		if( !newCode || typeof( newCode ) === "undefined" || newCode.length <= 0 || newCode === "" ) {

			this.lockedCodeModel['value'] = "";
		} else {

			this.lockedCodeModel['value'] = newCode;
		}

		this.pinSet = false;

		this.controller.modelChanged( this.lockedCodeModel );
	},

	toggleDisplayOptionsDrawer: function( event ) {

		this.controller.get( "displayOptionsDrawer" ).mojo.toggleState();

		var toggleButton = this.controller.get( "displayOptionsToggle" );

		if( this.controller.get( "displayOptionsDrawer" ).mojo.getOpenState() ) {

			toggleButton.addClassName( "palm-arrow-expanded" );
			toggleButton.removeClassName( "palm-arrow-closed" );
		} else {

			toggleButton.addClassName( "palm-arrow-closed" );
			toggleButton.removeClassName( "palm-arrow-expanded" );
		}
	},

	toggleAcctOptionsDrawer: function( event ) {

		this.controller.get( "acctOptionsDrawer" ).mojo.toggleState();

		var toggleButton = this.controller.get( "acctOptionsToggle" );

		if( this.controller.get( "acctOptionsDrawer" ).mojo.getOpenState() ) {

			toggleButton.addClassName( "palm-arrow-expanded" );
			toggleButton.removeClassName( "palm-arrow-closed" );
		} else {

			toggleButton.addClassName( "palm-arrow-closed" );
			toggleButton.removeClassName( "palm-arrow-expanded" );
		}
	},

	toggleTransactionOptionsDrawer: function( event ) {

		this.controller.get( "transacitonOptionsDrawer" ).mojo.toggleState();

		var toggleButton = this.controller.get( "transacitonOptionsToggle" );

		if( this.controller.get( "transacitonOptionsDrawer" ).mojo.getOpenState() ) {

			toggleButton.addClassName( "palm-arrow-expanded" );
			toggleButton.removeClassName( "palm-arrow-closed" );
		} else {

			toggleButton.addClassName( "palm-arrow-closed" );
			toggleButton.removeClassName( "palm-arrow-expanded" );
		}
	},

	/** Get account categories **/
	fetchCategories: function() {

		var acctCatQry = "SELECT * FROM accountCategories ORDER BY catOrder;";

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( acctCatQry, [], this.acctCatQryHandler.bind( this ), this.sqlError.bind( this ) );
				}
			).bind( this ) );
	},

	acctCatQryHandler: function( transaction, results ) {

		//Handle the results
		try {

			if( this.accountTypes.length > 0 ) {

				this.accountTypes.clear();
			}

			var icon = "";
			var color = "";

			for( var i = 0; i < results.rows.length; i++ ) {

				var row = results.rows.item( i );

				this.accountTypes.push(
							{
								label: row['name'],
								iconPath: "./images/" + row['icon'],
								command: row['name'] + "|./images/" + row['icon'] + "|" + row['color']
							}
						);

				if( this.accountCat === row['name'] ) {

					icon = "./images/" + row['icon'];
					color = row['color'];
				}
			}

			this.accountTypes.push(
						{
							label:"<span class='positiveBalance'>" + $L( "Add/Edit Categories" ) + "</span>",
							command:"|-add_edit-|"
						}
					);

			if( this.accountId === -1 ) {

				this.catModel = results.rows.item( 0 )['name'] + "|./images/" + results.rows.item( 0 )['icon'] + "|" + results.rows.item( 0 )['color'];
			} else {

				this.catModel = this.accountCat + "|" + icon + "|" + color;
			}

			this.selectCategoryHandler( this.catModel );
		} catch( err ) {

			systemError( "Add/Edit Account - Catagory Error: " + err );
		}

	},

	selectCategory: function() {

		this.controller.popupSubmenu(
				{
					popupClass: "expense-category-popup",
					onChoose: this.selectCategoryHandler,
					placeNear: this.controller.get( 'categoryRowLabel' ),
					items: this.accountTypes,
					toggleCmd: this.catModel
				}
			);
		event.stop();
	},

	selectCategoryHandler: function( choice ) {

		if( typeof( choice ) !== "undefined" && choice.length > 0 && choice != "" ) {

			if( choice === "|-add_edit-|" ) {

				this.controller.stageController.pushScene( "account-categories" );
			} else {

				var data = choice.split( "|" );

				this.catModel = data[0];

				this.controller.get( 'accountCategory' ).update( "<img src='" + data[1] + "' class='dropdown-image' />" + this.catModel );

				//Color background
				this.controller.get( 'categoryRowWrapper' ).className = "palm-row-wrapper custom-background " + data[2];
			}
		}
	},

	handleCommand: function( event ) {

		if( event.type === Mojo.Event.back && checkbookPrefs['bsSave'] === 1 ) {

			//Fetch Spike
			accountsDB.transaction(
				(
					function( transaction ) {

						transaction.executeSql( "SELECT spike FROM prefs LIMIT 1;", [], this.checkIt.bind( this ), this.qrySpikeError.bind( this ) );
					}
				).bind( this ) );
				event.stop();
		}

		if( event.type === Mojo.Event.command ) {

			var command = event.command;

			switch( command ) {
				case 'saveAccount':
					//Fetch Spike
					accountsDB.transaction(
						(
							function( transaction ) {

								transaction.executeSql( "SELECT spike FROM prefs LIMIT 1;", [], this.checkIt.bind( this ), this.qrySpikeError.bind( this ) );
							}
						).bind( this ) );
					event.stop();
					break;
				case 'noAccount':
					this.controller.stageController.popScene();
					event.stop();
					break;
				case 'delete':
					this.controller.showAlertDialog( {
							onChoose: function( value ) {

								if( value === true ) {

									this.updateLoadingSystem( true, $L( "Please wait..." ), $L( "" ), 0.8 );
									this.deleteAccount( this.index, this.closeAccountModSystem.bind( this ) );
								}
							},
							title: $L( "Delete" ),
							message: $L( "Are you sure you want to delete this account?" ),
							choices: [
								{
									label: $L( 'Delete Account' ),
									value: true,
									type: 'negative'
								}, {
									label: $L( 'Do Not Delete' ),
									value: false
								}
							]
						} );

					event.stop();
					break;
			}
		}
	},

	qrySpikeError: function( transaction, error ) {

		var errorMessage = " || SQL Error: " + arguments[arguments.length - 1].message +
								" (Code " + arguments[arguments.length - 1].code + ")" +
								" || Fetching Spike";

		systemError( errorMessage );
	},

	/** Check Required Fields **/
	checkIt: function( transaction, results ) {

		var row = results.rows.item( 0 );

		if( this.nameModel.value != "" && this.catModel != "" ) {

			this.updateLoadingSystem( true, $L( "Saving Changes" ), $L( "Please wait..." ), 0.8 );

			if( this.accountId < 0 ) {

				this.newAccount( this.nameModel.value, this.descModel.value, this.catModel, this.sortModel.value, this.defaultAccountModel.value, this.frozenModel.value, this.hiddenModel.value, this.lockedModel.value, this.lockedCodeModel.value, this.transDescMultiLineModel.value, this.showTransTimeModel.value, this.useAutoCompleteModel.value, this.atmEntryModel.value, this.autoSavingsModel.value, this.autoSavingsLink, this.balanceModel.value, this.runningBalanceModel.value, this.checkFieldModel.value, this.hideNotesModel.value, this.enableCategoriesModel.value, this.hideClearedModel.value, row['spike'], this.closeAccountModSystem.bind( this ) );
			} else {

				this.editAccount( this.accountId, this.nameModel.value, this.descModel.value, this.catModel, this.sortModel.value, this.defaultAccountModel.value, this.frozenModel.value, this.hiddenModel.value, this.lockedModel.value, this.lockedCodeModel.value, this.transDescMultiLineModel.value, this.showTransTimeModel.value, this.useAutoCompleteModel.value, this.atmEntryModel.value, this.autoSavingsModel.value, this.autoSavingsLink, this.balanceModel.value, this.runningBalanceModel.value, this.checkFieldModel.value, this.hideNotesModel.value, this.enableCategoriesModel.value, this.hideClearedModel.value, row['spike'], this.pinSet, this.closeAccountModSystem.bind( this ) );
			}
		} else if( this.nameModel.value == "" ) {

			this.controller.stageController.popScene();
			return;
		} else if( this.catModel == "" ) {

			Mojo.Controller.errorDialog( $L( "Account category must not be blank. If you do not have any, please go to Preferences & Accounts and tap Edit Account Categories and create one." ) );
		}
	},

	closeAccountModSystem: function() {

		this.controller.stageController.popScene();
	},

	deactivate: function( event ) {

		Mojo.Event.stopListening( this.controller.get( 'locked' ), Mojo.Event.propertyChange, this.secureCodeHandlerEvent );
		Mojo.Event.stopListening( this.controller.get( 'lockedCode' ), Mojo.Event.tap, this.pinCodeTapEvent );

		Mojo.Event.stopListening( this.controller.get( 'displayOptionsToggle' ), Mojo.Event.tap, this.toggleDisplayOptionsDrawerEvent );//Drawer
		Mojo.Event.stopListening( this.controller.get( 'categoryRow' ), Mojo.Event.tap, this.selectCategoryEvent );
		Mojo.Event.stopListening( this.controller.get( 'sorting' ), Mojo.Event.propertyChange, this.updateSortPreviewEvent );

		Mojo.Event.stopListening( this.controller.get( 'acctOptionsToggle' ), Mojo.Event.tap, this.toggleAcctOptionsDrawerEvent );//Drawer
		Mojo.Event.stopListening( this.controller.get( 'hidden' ), Mojo.Event.propertyChange, this.updateHiddenPreviewEvent );
		Mojo.Event.stopListening( this.controller.get( 'bal_view' ), Mojo.Event.propertyChange, this.updateBalancePreviewEvent );

		Mojo.Event.stopListening( this.controller.get( 'transacitonOptionsToggle' ), Mojo.Event.tap, this.toggleTransactionOptionsDrawerEvent );//Drawer
		Mojo.Event.stopListening( this.controller.get( 'autoSavings' ), Mojo.Event.propertyChange, this.autoSavingsHandlerEvent );
		Mojo.Event.stopListening( this.controller.get( 'autoSavingsLink-row' ), Mojo.Event.tap, this.autoSavingsLinkHandlerEvent );
	},

	cleanup : function( event ) {
	}

} );
