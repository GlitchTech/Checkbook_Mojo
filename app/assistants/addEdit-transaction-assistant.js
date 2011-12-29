/* Copyright 2009 and forward GlitchTech Science. All rights reserved. */

var AddEditTransactionAssistant = Class.create( commonModel, {

	initialize: function( $super, transObj, transType, transItemLocation ) {

		$super();

		this.transParent = transObj;
		this.currIndex = this.transParent.accountIndex;

		transactionData = this.transParent.transactionListModel['items'];

		var transItem;

		if( typeof( transactionData ) === "undefined" ||
			typeof( transItemLocation ) === "undefined" ||
			transItemLocation === "" ||
			transItemLocation < 0 ) {

			transItem = {};
		} else {

			transItem = transactionData[transItemLocation];
		}

		this.categoryData = [];

		if( 	typeof( transItem ) === "undefined" ||
			typeof( transItem['id'] ) === "undefined" ||
			transItem['id'].replace( /ID/i, "" ) === "" ||
			transItem['id'].replace( /ID/i, "" ) <= 0 ) {
			//add

			this.origObj = null;

			this.transactionId = 0;

			this.categoryModel = [
					{
						category: $L( "Uncategorized" ),
						category2: $L( "Other" ),
						amount: ''
					}
				];

			this.descModel = { value: "" };
			this.amountModel = { value: ( accounts_obj['items'][this.currIndex]['atmEntry'] === 1 ? "0.00" : "" ) };
			this.amountModelOri = "NOT_A_VALUE";

			this.dateTimeModel = Date.parse( Date() );

			this.accountId = this.transParent.accountId;

			this.transactionType = transType;

			this.linkedAccountId = this.transParent.accountId;
			this.linkedRecord = 0;

			this.clearedModel = { value: 0 };

			this.autoTrsnModel = { value: 1 };
			if( this.transactionType === "transfer" ) {

				this.autoTrsnModel.value = 0;
			}

			this.noteModel = { value: "" };

			this.checkNum = { value: "" };

			this.repeatUnlinked = 0;
			this.repeatTrsn = new repeatObj();
		} else {
			//edit

			this.origObj = transItem;

			this.transactionId = transItem['id'].replace( /ID/i, "" );

			if( transItem['category2'] === 'PARSE_CATEGORY' ) {

				this.categoryModel = eval( transItem['category'] );
			} else {

				//Old Format Category
				if( transItem['category2'] === null ) {

					transItem['category2'] = transItem['category'].split( "|", 2 )[1];
					transItem['category'] = transItem['category'].split( "|", 2 )[0];
				}

				this.categoryModel = [
						{
							category: transItem['category'],
							category2: transItem['category2'],
							amount: ''
						}
					];
			}

			this.descModel = { value: transItem['descData'] };
			this.amountModel = { value: Math.abs( transItem['amountData'] ).toFixed( 2 ) };
			this.amountModelOri = transItem['amountData'];

			this.dateTimeModel = parseInt( transItem['dateData'] );

			this.accountId = transItem['account'];

			if( transItem['linkedRecord'] && !isNaN( transItem['linkedRecord'] ) && transItem['linkedRecord'] !== "" ) {

				this.transactionType = "transfer";
			} else if( transItem['amountData'] < 0 ) {

				this.transactionType = "expense";
			} else {

				this.transactionType = "income";
			}

			this.linkedAccountId = ( ( transItem['linkedAccount'] === 0 || transItem['linkedAccount'] === "" ) ? transItem['account'] : transItem['linkedAccount'] );
			this.linkedRecord = transItem['linkedRecord'];

			this.clearedModel = { value: transItem['cleared'] };
			this.autoTrsnModel = { value: 0 };

			this.noteModel = { value: transItem['note'] };

			this.checkNum = { value: transItem['checkNum'] };

			this.repeatUnlinked = transItem['repeatUnlinked'];

			this.repeatTrsn = new repeatObj();
			this.repeatTrsn.id = transItem['repeatId'];
			this.repeatTrsn.oId = transItem['repeatId'];

			if( transItem['repeatFrequency'] != "" ) {

				this.repeatTrsn.frequency = transItem['repeatFrequency'];
				this.repeatTrsn.daysOfWeek = Mojo.parseJSON( transItem['repeatDaysOfWeek'] );
				this.repeatTrsn.itemSpan = transItem['repeatItemSpan'];
				this.repeatTrsn.endingCondition = transItem['repeatEndingCondition'];

				this.repeatTrsn.endDate = transItem['repeatEndDate'];
				this.repeatTrsn.endCount = transItem['repeatEndCount'];
				this.repeatTrsn.currCount = ( transItem['repeatCurrCount'] == "" || transItem['repeatCurrCount'] < 0 ? 0 : transItem['repeatCurrCount'] );
			} else {

				this.repeatTrsn = new repeatObj();
			}

			if( transType === "NEW_CLONE" ) {

				this.origObj = null;

				this.transactionId = 0;

				this.amountModelOri = "NOT_A_VALUE";

				this.dateTimeModel = Date.parse( Date() );

				this.linkedRecord = 0;

				this.clearedModel = { value: 0 };

				this.autoTrsnModel = { value: 1 };
				if( this.transactionType === "transfer" ) {

					this.autoTrsnModel.value = 0;
				}

				this.checkNum = { value: "" };

				this.repeatUnlinked = 0;
				this.repeatTrsn = new repeatObj();
			}
		}

		this.autoSuggestPopup = null;

		if( accounts_obj['items'][this.currIndex]['useAutoComplete'] === 1 ) {

			this.descAutoSuggestDebounce = Mojo.Function.debounce( undefined, this.descAutoSuggest.bind( this ), 0.5 );
			this.descAutoSuggestDebounce = this.descAutoSuggestDebounce.bindAsEventListener( this );
		} else {

			this.descAutoSuggestDebounce = function() {}.bindAsEventListener( this );
		}

		if( accounts_obj['items'][this.currIndex]['atmEntry'] === 1 ) {

			this.atmModeHandler = Mojo.Function.debounce( undefined, this.atmMode.bind( this ), 0.01 );
			this.atmModeHandler = this.atmModeHandler.bindAsEventListener( this );
		} else {

			this.atmModeHandler = function() {}.bindAsEventListener( this );
		}

		if( accounts_obj['items'][this.currIndex]['enableCategories'] === 1 ) {

			this.selectCategoryHandler = this.selectCategory.bindAsEventListener( this );
		} else {

			this.selectCategoryHandler = function() {}.bindAsEventListener( this );
		}

		this.selectLinkedAccountHandler = this.selectLinkedAccount.bindAsEventListener( this );

		this.selectDateTimeHandler = this.selectDateTime.bindAsEventListener( this );
		this.selectRepeatHandler = this.selectRepeat.bindAsEventListener( this );
		this.selectAccountHandler = this.selectAccount.bindAsEventListener( this );

		this.autoFillCheckNumEventHandler = this.autoFillCheckNum.bindAsEventListener( this );

		this.changeFlowHandler = this.changeFlow.bindAsEventListener( this );
	},

	setup: function() {

		//Add suggestions
		this.controller.setupWidget(
				"description",
				{//Attributes
					hintText: $L( "Description" ),
					multiline: ( accounts_obj['items'][this.currIndex]['transDescMultiLine'] == 1 ? true : false ),
					changeOnKeyPress: true
				},
				this.descModel
			 );

		this.controller.setupWidget(
				"amount",
				{//Attributes
					hintText: "",
					maxLength: 15,
					modifierState: Mojo.Widget.numLock,
					charsAllow: function( charCode ) {

						return( ( charCode >= 48 && charCode <= 57 ) || ( charCode === 46 ) );
					},
					changeOnKeyPress: true
				},
				this.amountModel
			 );

		//Elem ID: expenseCategory
		//Event listener on categoryRow acts as button
		this.controller.get( 'expenseCategory' ).update( this.formatCategoryDisplay( this.categoryModel ) );//UPDATE
		//Adapt for split transactions
			//now array of objects

		//Elem ID: dateTime_info
		//Event listener on row acts as dateTime button
		this.controller.get( 'dateTime_info' ).update( formatDate( new Date( parseInt( this.dateTimeModel ) ), { date: 'medium', time: 'short' } ) );

		//Elem ID: repeatRow
		//Event listener on row acts as repeat button
		//Updated in aboutToActivate

		this.controller.setupWidget(
				"checkNum",
				{//Attributes
					hintText: $L( "# ( optional )" ),
					maxLength: 15,
					modifierState: Mojo.Widget.numLock,
					focusMode: Mojo.Widget.focusSelectMode
				},
				this.checkNum
			 );

		this.controller.setupWidget(
				"cleared",
				{//Attributes
					trueValue: 1,
					trueLabel: $L( "Yes" ),
					falseValue: 0,
					falseLabel: $L( "No" )
				},
				this.clearedModel
			 );

		this.controller.setupWidget(
				"autoTrsn",
				{//Attributes
					trueValue: 1,
					trueLabel: $L( "Yes" ),
					falseValue: 0,
					falseLabel: $L( "No" )
				},
				this.autoTrsnModel
			 );

		this.controller.setupWidget(
				"note",
				{//Attributes
					hintText: $L( "Transaction notes" ),
					multiline: true
				},
				this.noteModel
			 );

		this.addTransactionButton = {
					visible: true,
					items: [
						{
							label: $L( 'Done' ),
							command:'saveTransaction'
						}, {
							icon:'calc',
							command: 'calc'
						}, {
							label: $L( 'Cancel' ),
							command:'noTransaction'
						}
					]
				};

		this.controller.setupWidget( Mojo.Menu.commandMenu, { menuClass: 'no-fade' }, this.addTransactionButton );

		var transactionMenuModel = {
							visible: true,
							items: [
								Mojo.Menu.editItem,
								appMenuPrefAccountsDisabled,
								appMenuFeaturesDisabled,
								{
									label: $L( "Delete Item" ),
									command: "delete"
								},
								cbAboutItem,
								cbHelpItem
							]
						};

		this.controller.setupWidget( Mojo.Menu.appMenu, appMenuOptions, transactionMenuModel );

		this.setupLoadingSystem();
	},

	ready: function() {

		/** TEMP **/
		Element.hide( this.controller.get( 'repeatRow' ) );

		//Set up visibility based on account
		this.adjustCheckFieldRow();
		this.adjustCategoryRow();
		this.adjustATRow();

		//Handle transcation logic
		if( this.transactionType === 'income' ) {

			this.linkedAccountId = null;

			this.controller.get( 'amountWrapper' ).addClassName( 'pos' );
			Element.hide( this.controller.get( 'linkedAccountRow' ) );
		} else if( this.transactionType === 'transfer' ) {

			this.controller.get( 'amountWrapper' ).addClassName( 'trans' );
			Element.show( this.controller.get( 'linkedAccountRow' ) );

			if( this.amountModelOri !== "NOT_A_VALUE" && this.amountModelOri >= 0 ) {
				//Money transfered to here

				this.controller.get( 'linkedAccountLabel' ).update( $L( "Transfer From..." ) );
			}
		} else if( this.transactionType === 'expense' ) {

			this.linkedAccountId = null;

			this.controller.get( 'amountWrapper' ).addClassName( 'neg' );
			Element.hide( this.controller.get( 'linkedAccountRow' ) );
		}

		//Change primary account button color
		this.controller.get( 'primaryAccountParent' ).addClassName( 'green' );

		this.controller.get( 'linkedAccountLabel' ).update( $L( "Transfer To..." ) );
		this.controller.get( 'amount-label' ).update( $L( "Amount" ) );
		this.controller.get( 'categoryRowLabel' ).update( $L( "Category" ) );
		this.controller.get( 'check-number-label' ).update( $L( "Check Number" ) );
		this.controller.get( 'cleared-status-label' ).update( $L( "Cleared" ) );
		this.controller.get( 'autoTrsn-label' ).update( $L( "Auto Transfer" ) );

		//Set account display data
		this.controller.get( 'primaryAccount' ).update( this.getAccountName( this.accountId ) );

		this.controller.get( 'linkedAccount' ).update( this.getAccountImage( this.linkedAccountId ) + this.getAccountName( this.linkedAccountId ) );

		if( checkbookPrefs['dispColor'] === 1 ) {

			this.controller.get( 'primaryAccountParent' ).className = "account-selector custom-button right " + this.getAccountColor( this.accountId );
			this.controller.get( 'descriptionRow' ).className = "palm-row custom-background " + this.getAccountColor( this.accountId );
			this.controller.get( 'linkedAccountRow' ).className = "palm-row custom-background " + this.getAccountColor( this.linkedAccountId );
		}

		this.hideLoadingSystem();
	},

	//500ms before activate
	aboutToActivate: function() {

		this.updateRepeatView();

		if( accounts_obj['items'][this.currIndex]['enableCategories'] === 1 ) {

			this.fetchCategoryData();
		}
	},

	//Scene made visible
	activate: function( event ) {

		Mojo.Event.listen( this.controller.get( 'description' ), Mojo.Event.propertyChange, this.descAutoSuggestDebounce );

		Mojo.Event.listen( this.controller.get( 'amount' ), Mojo.Event.propertyChange, this.atmModeHandler );

		Mojo.Event.listen( this.controller.get( 'categoryRow' ), Mojo.Event.tap, this.selectCategoryHandler );
		Mojo.Event.listen( this.controller.get( 'dateTimeRow' ), Mojo.Event.tap, this.selectDateTimeHandler );
		Mojo.Event.listen( this.controller.get( 'repeatRow' ), Mojo.Event.tap, this.selectRepeatHandler );

		Mojo.Event.listen( this.controller.get( 'primaryAccountParent' ), Mojo.Event.tap, this.selectAccountHandler );
		Mojo.Event.listen( this.controller.get( 'linkedAccountRow' ), Mojo.Event.tap, this.selectLinkedAccountHandler );

		Mojo.Event.listen( this.controller.get( 'amountWrapper' ), Mojo.Event.tap, this.changeFlowHandler );

		Mojo.Event.listen( this.controller.get( 'checkNum' ), Mojo.Event.tap, this.autoFillCheckNumEventHandler, true );

		this.autoSuggestSelectionMade = false;
	},

	changeFlow: function( event ) {

		switch( this.transactionType ) {

			case 'expense':
				this.controller.get( 'amountWrapper' ).addClassName( 'pos' );
				Element.hide( this.controller.get( 'linkedAccountRow' ) );

				this.controller.get( 'amountWrapper' ).removeClassName( 'neg' );
				this.transactionType = 'income';
				break;
			case 'transfer':
				//this.controller.get( 'amountWrapper' ).addClassName( 'trans' );
				//Element.show( this.controller.get( 'linkedAccountRow' ) );
				break;
			case 'income':
				this.controller.get( 'amountWrapper' ).addClassName( 'neg' );
				Element.hide( this.controller.get( 'linkedAccountRow' ) );

				this.controller.get( 'amountWrapper' ).removeClassName( 'pos' );
				this.transactionType = 'expense';
				break;
		}
	},

	descAutoSuggest: function( event ) {

		if( event.value.length >= 1 && event.value != event.oldValue ) {

			accountsDB.transaction(
				(
					function( transaction ) {

						var suggestQry = "SELECT DISTINCT desc FROM transactions WHERE desc LIKE ? ORDER BY desc ASC LIMIT 100;";

						transaction.executeSql( suggestQry, [event.value + "%"], this.descAutoSuggestHandler.bind( this, event.value ), this.sqlError.bind( this, "descAutoSuggest", suggestQry ) );
					}
				 ).bind( this ) );
		} else {

			try{

				this.autoSuggestPopup.mojo.close();
			} catch( err ) {}

			this.autoSuggestPopup = null;

			if( this.autoSuggestSelectionMade === true ) {

				this.controller.get( 'amount' ).mojo.focus();
			} else {

				this.controller.get( 'description' ).mojo.focus();
			}
		}
	},

	descAutoSuggestHandler: function( checkedValue, transaction, results ) {

		var oriValue = "";

		try {

			oriValue = this.controller.get( 'description' ).mojo.getValue();
		} catch( err ) {

			systemError( err );
		}

		if( checkedValue !== oriValue || oriValue === "" ) {

			//Ignore it, old request
		} else {

			if( results.rows.length > 0 ) {

				var suggestData = [];

				suggestData.push(
						{
							label: oriValue,
							command: oriValue
						}
					 );

				for( var i = 0; i < results.rows.length; i++ ) {

					var row = results.rows.item( i );

					if( oriValue.toLowerCase() != row['desc'].toLowerCase() ) {

						suggestData.push(
								{
									label: row['desc'],
									command: row['desc']
								}
							 );
					}
				}

				if( suggestData.length > 1 && this.autoSuggestSelectionMade !== true ) {

					this.autoSuggestSelectionMade = false;

					this.autoSuggestPopup = this.controller.popupSubmenu(
							{
								onChoose: function( descValue ) {

									Mojo.Event.stopListening( this.controller.get( 'description' ), Mojo.Event.propertyChange, this.descAutoSuggestDebounce );

									this.setAutoSuggestionMadeFalse.delay( 1, this );

									if( typeof( descValue ) !== "undefined" && descValue.length > 0 && descValue != "" ) {

										this.controller.get( 'description' ).mojo.setValue( descValue );
										this.descModel.value = descValue;
										this.controller.get( 'amount' ).mojo.focus();

										accountsDB.transaction(
											(
												function( transaction ) {

													//UPDATE for split transactions
													var catQry = "SELECT ( CASE WHEN category2 = '' THEN LTRIM( category, '|' ) ELSE category END ) AS category, ( CASE WHEN category2 = '' THEN RTRIM( category, '|' ) ELSE category2 END ) AS category2, COUNT( * ) AS count FROM transactions WHERE desc = ? AND category != '' AND category != 'None' GROUP BY category, category2 ORDER BY count DESC LIMIT 1;";

													transaction.executeSql( catQry, [ descValue ], this.autoSuggestCategoryHandler.bind( this ), this.sqlError.bind( this, "autosuggest fill category", catQry ) );

													if( this.transactionType === 'transfer' ) {

														var linkQry = "SELECT linkedAccount FROM ( SELECT linkedAccount, COUNT( * ) AS count FROM transactions WHERE desc = ? AND linkedAccount != '' AND account = ? GROUP BY linkedAccount ORDER BY count DESC ) LIMIT 1;";

														transaction.executeSql( linkQry, [ descValue, this.accountId ], this.autoSuggestLinkedHandler.bind( this ), this.sqlError.bind( this, "autosuggest fill linked account", linkQry ) );
													}
												}
											 ).bind( this ) );

										this.autoSuggestSelectionMade = true;
									}
								},
								manualPlacement: true,
								popupClass: "account-selector-popup",
								scrimClass: "none",
								items: suggestData
							}
						 );
				} else if( suggestData.length > 1 && this.autoSuggestSelectionMade === true ) {

					this.autoSuggestSelectionMade = false;

					try{

						this.autoSuggestPopup.mojo.close();
					} catch( err ) {}

					this.autoSuggestPopup = null;
				} else {

					try{

						this.autoSuggestPopup.mojo.close();
					} catch( err ) {}

					this.autoSuggestPopup = null;

					if( this.autoSuggestSelectionMade === true ) {

						this.controller.get( 'amount' ).mojo.focus();
					} else {

						this.controller.get( 'description' ).mojo.focus();
					}
				}
			} else {

				try{

					this.autoSuggestPopup.mojo.close();
					this.autoSuggestPopup = null;
				} catch( err ) {}

				if( this.autoSuggestSelectionMade === true ) {

					this.controller.get( 'amount' ).mojo.focus();
				} else {

					this.controller.get( 'description' ).mojo.focus();
				}
			}
		}
	},

	setAutoSuggestionMadeFalse: function( mainObj ) {

		mainObj.autoSuggestSelectionMade = false;

		Mojo.Event.listen( mainObj.controller.get( 'description' ), Mojo.Event.propertyChange, mainObj.descAutoSuggestDebounce );
	},

	autoSuggestCategoryHandler: function( transaction, results ) {
		//Adapt for split transactions

		try {

			var row = results.rows.item( 0 );

			//Split Category
			if( row['category2'] === 'PARSE_CATEGORY' ) {

				//JSON formatted string [{ category, category2, amount }]
				this.categoryModel = row['category'].evalJSON();
			} else {

				//Old Format Category
				if( row['category2'] === null ) {

					var cat = row['category'].split( "|", 2 );
					this.categoryModel = [
						{
							category: cat[0],
							category2: cat[1],
							amount: ""
						}
					];
				} else {

					this.categoryModel = [
						{
							category: row['category'],
							category2: row['category2'],
							amount: ""
						}
					];
				}
			}

			this.controller.get( 'expenseCategory' ).update( this.formatCategoryDisplay( this.categoryModel ) );//UPDATE
		} catch( err ) {

			//Error, doesn't really matter
		}
	},

	autoSuggestLinkedHandler: function( transaction, results ) {

		try {

			this.linkedAccountId = results.rows.item( 0 )['linkedAccount'];

			this.controller.get( 'linkedAccount' ).update( this.getAccountImage( this.linkedAccountId ) + this.getAccountName( this.linkedAccountId ) );

			if( checkbookPrefs['dispColor'] === 1 ) {

				this.controller.get( 'linkedAccountRow' ).className = "palm-row custom-background " + this.getAccountColor( this.linkedAccountId );
			}
		} catch( err ) {
		}
	},

	atmMode: function( event ) {

		if( typeof( event ) !== "undefined" ) {

			//save cursor position
			var curPos = this.controller.get( 'amount' ).mojo.getCursorPosition();

			//format number
			var amtStr = event.value;

			if( typeof( event.oldValue ) === "undefined" || event.oldValue.length <= 0 ) {
				//Error sometimes, but not here
				//Uncaught TypeError: Cannot read property 'length' of undefined, palmInitFramework200_18:29180

				curPos['selectionStart'] = 4;
				curPos['selectionEnd'] = 4;
			}

			if( typeof( event.oldValue ) !== "undefined" && ( event.oldValue.length - 1 ) === event.value.length ) {

				curPos['selectionStart'] = curPos['selectionStart'] + 1;
				curPos['selectionEnd'] = curPos['selectionEnd'] + 1;
			}

			if( amtStr == "" || amtStr == 0 ) {

				amtStr = "0.00";
			} else {

				amtStr = amtStr.replace( /[^0-9]/g, "" );
				amtStr = amtStr.replace( /^0*/, "" );

				amtStr = ( parseInt( amtStr ) / 100 ).toFixed( 2 );
				//Mojo.Format breaks this currently
				//amtStr = Mojo.Format.formatCurrency( ( parseInt( amtStr ) / 100 ), 2 );
			}

			this.controller.get( 'amount' ).mojo.setValue( amtStr );
			this.amountModel.value = amtStr;

			//if delete key pressed, move cursor 1 to the right

			//restore cursor position
			this.controller.get( 'amount' ).mojo.setCursorPosition( curPos['selectionStart'], curPos['selectionEnd'] );
		}
	},

	selectDateTime: function( event ) {

		event.stop();

		this.controller.showDialog(
				{
					template: 'dialogs/datetime-dialog',
					assistant: new transactionDTDialog( this, this.dateTimeModel )
				}
			 );

		//Scroll to top
		this.controller.getSceneScroller().mojo.revealTop( 0 );
	},

	fetchCategoryData: function() {

		this.categoryData = {
				category: [],
				category2: {}
			};

		var catQuery = "SELECT * FROM transactionCategories ORDER BY genCat, specCat LIMIT 25 OFFSET 0;";

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( catQuery, [], this.categoryDataHandler.bind( this, null, 0 ), this.sqlError.bind( this, "FetchCat Data", catQuery ) );
				}
			 ).bind( this ) );
	},

	categoryDataHandler: function( currCat, currItem, transaction, results ) {

		for( var i = 0; i < results.rows.length; i++ ) {

			var row = results.rows.item( i );

			if( !currCat || currCat !== row['genCat'] ) {

				if( row['genCat'] !== "" ) {

					this.categoryData['category'].push(
								{
									label: row['genCat'],
									command: row['genCat'],
									iconPath: './images/rdouble.png'
								}
							 );
				}

				if( currCat && currCat !== "" ) {

					this.categoryData['category2'][currCat].push(
								{
									label: "<img src='./images/ldouble.png' alt='&laquo;' /> " + $L( "Back" ),
									command: "|-go_back-|"
								}
							 );
				}

				currCat = row['genCat'];
				this.categoryData['category2'][currCat] = [];
			}

			this.categoryData['category2'][currCat].push(
						{
							label: row['specCat'],
							command: row['specCat']
						}
					 );
		}

		if( results.rows.length < 25 ) {

			if( currCat !== "" ) {

				this.categoryData['category2'][currCat].push(
							{
								label:"<img src='./images/ldouble.png' alt='&laquo;' /> " + $L( "Back" ),
								command:"|-go_back-|"
							}
						 );
			}

			this.categoryData['category'].push(
						{
							label:"<span class='positiveBalance'>" + $L( "Add/Edit Categories" ) + "</span>",
							command:"|-add_edit-|"
						}
					 );
		} else {

			currItem = currItem + 25;

			var catQuery = "SELECT * FROM transactionCategories ORDER BY genCat, specCat LIMIT 25 OFFSET ?;";

			accountsDB.transaction(
				(
					function( transaction ) {

						transaction.executeSql( catQuery, [ currItem ], this.categoryDataHandler.bind( this, currCat, currItem ), this.sqlError.bind( this, "cat data handler", catQuery ) );
					}
				 ).bind( this ) );
		}
	},

	selectCategory: function() {
		//Adapt for split transactions

		this.controller.popupSubmenu(
				{
					popupClass: "expense-category-popup",
					onChoose: this.selectSubCategory.bind( this ),
					placeNear: this.controller.get( 'categoryRowLabel' ),
					items: this.categoryData['category'],//Main account items, link to submenu of items
					toggleCmd: this.categoryModel[0]['category']
				}
			 );
		event.stop();
	},

	selectSubCategory: function( choice ) {
		//Adapt for split transactions

		if( typeof( choice ) !== "undefined" && choice.length > 0 && choice != "" ) {

			if( choice === "|-add_edit-|" ) {

				this.controller.stageController.pushScene( "transaction-categories" );
			} else {

				this.controller.popupSubmenu(
						{
							onChoose: function( subChoice ) {

								Mojo.Log.info( choice + "|" + subChoice );

								if( typeof( subChoice ) !== "undefined" && subChoice.length > 0 && subChoice != "" ) {

									if( subChoice === "|-go_back-|" ) {

										this.selectCategory();
									} else {

										this.categoryModel = [
												{
													"category": choice,
													"category2": subChoice,
													"amount": ''
												}
											];

								Mojo.Log.info( this.categoryModel.length );

										this.controller.get( 'expenseCategory' ).update( this.formatCategoryDisplay( this.categoryModel ) );//UPDATE
									}
								}
							}.bind( this ),
							placeNear: this.controller.get( 'categoryRowLabel' ),
							items: this.categoryData['category2'][choice],
							toggleCmd: ( ( this.categoryModel[0]['category'] === choice ) ? this.categoryModel[0]['category2'] : "" )
						}
					 );
			}
		}
	},

	formatCategoryDisplay: function( catObject ) {

		if( typeof( catObject[0] ) === "undefined" ||
			typeof( catObject[0]['category'] ) === "undefined" || catObject[0]['category'] === "" ||
			typeof( catObject[0]['category2'] ) === "undefined" || catObject[0]['category2'] === "" ) {

			return $L( "Other" );
		}

		return catObject[0]['category2'];
	},

	selectRepeat: function( event ) {
		event.stop();

		this.controller.stageController.pushScene( "repeat", this );
	},

	selectAccount: function( event ) {
		event.stop();

	 this.controller.popupSubmenu(
				{
					onChoose: this.selectAccountChoose.bind( this ),
					toggleCmd: this.accountId,
					manualPlacement: true,
					popupClass: "account-selector-popup",
					items: accounts_obj['popup']
				}
			 );
	},

	selectAccountChoose: function( value ) {

		if( typeof( value ) !== "undefined" && value != "" ) {

			this.accountId = value;
			this.controller.get( 'primaryAccount' ).update( this.getAccountName( this.accountId ) );

			if( checkbookPrefs['dispColor'] === 1 ) {

				this.controller.get( 'primaryAccountParent' ).className = "account-selector custom-button right " + this.getAccountColor( this.accountId );
				this.controller.get( 'descriptionRow' ).className = "palm-row custom-background " + this.getAccountColor( this.accountId );
			}

			this.getAccountById( this.accountId, this.changeAccountInteraction.bind( this ) );
		}
	},

	/** Change settings to match current account **/
	changeAccountInteraction: function( newIndex ) {

		if( newIndex === -1 ) {

			return;
		}

		this.startSpinner();

		this.currIndex = newIndex;

		//Adjust bindings
		if( accounts_obj['items'][this.currIndex]['useAutoComplete'] === 1 ) {

			this.descAutoSuggestDebounce = Mojo.Function.debounce( undefined, this.descAutoSuggest.bind( this ), 0.5 );
			this.descAutoSuggestDebounce = this.descAutoSuggestDebounce.bindAsEventListener( this );
		} else {

			this.descAutoSuggestDebounce = function() {}.bindAsEventListener( this );
		}

		if( accounts_obj['items'][this.currIndex]['atmEntry'] === 1 ) {

			this.atmModeHandler = Mojo.Function.debounce( undefined, this.atmMode.bind( this ), 0.01 );
			this.atmModeHandler = this.atmModeHandler.bindAsEventListener( this );
		} else {

			this.atmModeHandler = function() {}.bindAsEventListener( this );
		}

		if( accounts_obj['items'][this.currIndex]['enableCategories'] === 1 ) {

			this.selectCategoryHandler = this.selectCategory.bindAsEventListener( this );
		} else {

			this.selectCategoryHandler = function() {}.bindAsEventListener( this );
		}

		//Adjust visibility
		this.adjustCheckFieldRow();
		this.adjustCategoryRow();
		this.adjustATRow();

		//Load categories if needed
		if( this.categoryData.length < 0 && accounts_obj['items'][this.currIndex]['enableCategories'] === 1 ) {

			this.fetchCategoryData();
		}

		this.stopSpinner();
	},

	adjustCheckFieldRow: function() {

		if( accounts_obj['items'][this.currIndex]['checkField'] !== 1 ) {

			Element.hide( this.controller.get( 'checkNumRow' ) );
		} else {

			Element.show( this.controller.get( 'checkNumRow' ) );

			accountsDB.transaction(
				(
					function( transaction ) {

						transaction.executeSql(
								"SELECT MAX( checkNum ) AS maxCheckNum FROM transactions WHERE account = ?;",
								[
									this.accountId
								],
								this.autoFillCheckNumHandler.bind( this ),
								this.sqlError.bind( this, "maxCheckNum" )
							 );
					}
				 ).bind( this ) );
		}
	},

	autoFillCheckNumHandler: function( transaction, results ) {

		if( results.rows.length >= 1 ) {

			var foundValue = parseInt( results.rows.item( 0 )['maxCheckNum'] );

			if( !isNaN( foundValue ) ) {

				this.checkNum.previousMax = foundValue + 1;
			}
		}
	},

	adjustCategoryRow: function() {

		if( accounts_obj['items'][this.currIndex]['enableCategories'] !== 1 ) {

			Element.hide( this.controller.get( 'categoryRow' ) );
		} else {

			Element.show( this.controller.get( 'categoryRow' ) );
		}
	},

	adjustATRow: function() {

		if( this.transactionId === 0 && accounts_obj['items'][this.currIndex]['autoSavings'] > 0 && accounts_obj['items'][this.currIndex]['autoSavingsLink'] >= 0 ) {

			Element.show( this.controller.get( 'autoTrsnRow' ) );
		} else {

			Element.hide( this.controller.get( 'autoTrsnRow' ) );
			this.autoTrsnModel.value = 0;
		}
	},

	autoFillCheckNum: function( event ) {

		if( this.checkNum.value.length <= 0 ) {

			this.checkNum.value = this.checkNum.previousMax.toString();
			this.controller.modelChanged( this.checkNum );

			this.controller.get( 'checkNum' ).mojo.setCursorPosition( 0, this.checkNum.value.length );
		}
	},

	selectLinkedAccount: function( event ) {
		event.stop();

	 this.controller.popupSubmenu(
				{
					onChoose: this.selectLinkedAccountChoose.bind( this ),
					toggleCmd: this.linkedAccountId,
					manualPlacement: true,
					popupClass: "account-selector-popup",
					items: accounts_obj['popup']
				}
			 );
	},

	selectLinkedAccountChoose: function( choice ) {

		if( typeof( choice ) !== "undefined" && choice.length > 0 && choice != "" ) {

			this.linkedAccountId = choice;
			this.controller.get( 'linkedAccount' ).update( this.getAccountImage( this.linkedAccountId ) + this.getAccountName( this.linkedAccountId ) );

			if( checkbookPrefs['dispColor'] === 1 ) {

				this.controller.get( 'linkedAccountRow' ).className = "palm-row custom-background " + this.getAccountColor( this.linkedAccountId );
			}
		}
	},

	/** Create new transaction **/
	handleCommand: function( event ) {

		if( event.type === Mojo.Event.back && checkbookPrefs['bsSave'] === 1 ) {

			this.processForm();
			event.stop();
		}

		if( event.type == Mojo.Event.command ) {

			var command = event.command;

			switch( command ) {

				case 'saveTransaction':
					this.processForm();
					event.stop();
					break;
				case 'noTransaction':
					this.controller.stageController.popScene();
					event.stop();
					break;
				case 'delete':
					this.deleteItem();
					event.stop();
					break;
				case 'calc':
					this.controller.serviceRequest(
							'palm://com.palm.applicationManager',
							{
								method: 'launch',
								parameters: {
									id: 'com.palm.app.calculator',
									params: ''
								}
							} );
					break;
			}
		}
	},

	updateRepeatView: function() {

		var jsonForDisp = ( this.repeatTrsn.frequency === "" ? "" : this.repeatTrsn.frequency );

		var dateObj = new Date( parseInt( this.dateTimeModel ) );

		var dayFormatter = Mojo.Format.formatChoice( dateObj.getDate(), "1#1st|2#2nd|3#3rd|3>##{day}th", { day: dateObj.getDate() } )

		switch( jsonForDisp ) {
			case "day( s )":
				this.controller.get( 'repeat_info' ).update( "Daily" );
				break;
			case "week( s )":
				this.controller.get( 'repeat_info' ).update( "Weekly" );
				break;
			case "month( s )":
				this.controller.get( 'repeat_info' ).update( "Monthly on the " + dayFormatter );
				break;
			case "year( s )":
				this.controller.get( 'repeat_info' ).update( "Yearly on " + formatDate( dateObj, { date: 'medium', time: '' } ).slice( 0, 3 ) + " " + dayFormatter );
				break;
			default:
				this.controller.get( 'repeat_info' ).update( "No Repeat" );
		}
	},

	processForm: function( event ) {

		if( ( this.amountModel.value === "" || isNaN( this.amountModel.value ) ) && ( this.descModel.value === "" || this.descModel.value === null ) && this.noteModel.value === "" ) {
			//Bad name, bad amount and bad note

			this.controller.stageController.popScene();
			return;
		}

		this.startSpinner();

		if( 	this.amountModel.value === "" || isNaN( this.amountModel.value ) ) {
			//Bad amount

			this.amountModel.value = 0;
		}

		if( this.descModel.value === "" || this.descModel.value === null ) {
			//Bad name

			this.descModel.value = $L( "Description" );
		}

		switch( this.transactionType ) {

			case 'income':
				this.amountModel.value = Math.abs( this.amountModel.value );
				break;
			case 'transfer':
				if( this.amountModelOri !== "NOT_A_VALUE" && this.amountModelOri < 0 ) {
					//Money transfered from here

					this.amountModel.value = Math.abs( this.amountModel.value );
				} else if( this.amountModelOri !== "NOT_A_VALUE" && this.amountModelOri >= 0 ) {
					//Money transfered to here

					this.amountModel.value = -Math.abs( this.amountModel.value );
				} else {

					this.amountModel.value = Math.abs( this.amountModel.value );
				}
				break;
			case 'expense':
				this.amountModel.value = -Math.abs( this.amountModel.value );
				break;
		}

		this.amountModel.value = Number( this.amountModel.value.toFixed( 2 ) ).valueOf();

		accountsDB.transaction(
			(
				function( transaction ) {

					var maxIdQry = "SELECT ( SELECT IFNULL( MAX( itemId ), 0 ) FROM transactions LIMIT 1 ) AS maxRowId, ( SELECT IFNULL( MAX( repeatId ), 0 ) FROM repeats LIMIT 1 ) AS maxRepeatId;"

					transaction.executeSql( maxIdQry, [], this.qryIdHandler.bind( this ), this.sqlError.bind( this, "MaxId", maxIdQry ) );
				}
			 ).bind( this ) );
	},

	qryIdHandler: function( transaction, results ) {

		//Set max Ids, if doesn't exist set to 0
		var maxId = ( results.rows.length > 0 ? results.rows.item( 0 )['maxRowId'] + 1 : 0 );
		var maxRepeatId = ( results.rows.length > 0 ? results.rows.item( 0 )['maxRepeatId'] + 1 : 0 );

		if( this.transactionId === 0 ) {
			//New

			this.transactionId = maxId;

			if( this.repeatTrsn.frequency !== "" ) {
				//Repeating Transaction

				this.repeatTrsn.id = maxRepeatId;

				this.repeat_newItem( this.repeatTrsn,
									this.transactionId,
									this.descModel.value,
									this.amountModel.value,
									( this.clearedModel.value === 1 ),
									this.noteModel.value,
									this.dateTimeModel,
									this.accountId,
									this.categoryModel,
									this.linkedAccountId,
									this.checkNum.value,
									this.autoTrsnModel.value,
									accounts_obj['items'][this.currIndex]['autoSavingsLink'],

									this.scrollAndClose.bind( this )
								 );
			} else {
				//Single Transaction

				this.addTransaction( this.transactionId,
									this.descModel.value,
									this.amountModel.value,
									( this.clearedModel.value === 1 ),
									this.noteModel.value,
									this.dateTimeModel,
									this.accountId,
									this.categoryModel,
									this.linkedAccountId,
									"",//No repeat
									this.checkNum.value,
									this.autoTrsnModel.value,
									accounts_obj['items'][this.currIndex]['autoSavingsLink'],

									this.scrollAndClose.bind( this )
								 );
			}
		} else {
			//update

			if( this.repeatTrsn.frequency !== "" && this.repeatUnlinked === 0 ) {
				//Repeating & not stand alone

				//Did anything significant change?
				var otherChanged = false;
				var minorChanged = false;
				var repeatChanged = false;

				try {

					//Adapt for split transactions
					if( !( this.transactionId === this.origObj['id'].replace( /ID/i, "" ) ) ||
						/*!( this.categoryModel === this.origObj['category'] ) ||//UPDATE*/
						!( this.descModel.value === this.origObj['descData'] ) ||
						!( this.amountModel.value === this.origObj['amountData'].toFixed( 2 ) ) ||
						!( this.dateTimeModel === parseInt( this.origObj['dateData'] ) ) ||
						!( this.accountId === this.origObj['account'] ) ||
						!( this.linkedAccountId === ( ( this.origObj['linkedAccount'] === 0 || this.origObj['linkedAccount'] === "" ) ? this.origObj['account'] : this.origObj['linkedAccount'] ) ) ||
						!( this.linkedRecord === this.origObj['linkedRecord'] ) ||
						!( this.noteModel.value === this.origObj['note'] ) ) {

						otherChanged = true;
					}
				} catch( err ) {

					otherChanged = true;
				}

				try {

					if( !( this.clearedModel.value === this.origObj['cleared'] ) || !( this.checkNum.value === this.origObj['checkNum'] ) ) {

						minorChanged = true;
					}
				} catch( err ) {

					minorChanged = true;
				}


				try {

					if( 	!( this.repeatTrsn.id === this.origObj['repeatId'] ) ||
						!( this.repeatTrsn.oId === this.origObj['repeatId'] ) ||
						!( this.repeatTrsn.frequency === this.origObj['repeatFrequency'] ) ||
						!( Object.toJSON( this.repeatTrsn.daysOfWeek ) === this.origObj['repeatDaysOfWeek'] ) ||
						!( this.repeatTrsn.itemSpan === this.origObj['repeatItemSpan'] ) ||
						!( this.repeatTrsn.endingCondition === this.origObj['repeatEndingCondition'] ) ||
						!( this.repeatTrsn.endDate === this.origObj['repeatEndDate'] ) ||
						!( this.repeatTrsn.endCount === this.origObj['repeatEndCount'] ) ||
						!( this.repeatTrsn.currCount === ( this.origObj['repeatCurrCount'] == "" || this.origObj['repeatCurrCount'] < 0 ? 0 : this.origObj['repeatCurrCount'] ) ) ) {

						repeatChanged = true;
					}
				} catch( err ) {

					repeatChanged = true;
				}

				if( !otherChanged && !minorChanged && !repeatChanged ) {
					//If nothing changed

					this.scrollAndClose();
				} else if( this.repeatTrsn.oId == "" || this.repeatTrsn.oId < 0 ) {
					//New to repeating

					/** NEW ITEMS NOT SAVING DB LINK **/

					this.repeatTrsn.id = maxRepeatId;

					this.repeat_updateItem( this.repeatTrsn,
										"new",
										this.descModel.value,
										this.amountModel.value,
										( this.clearedModel.value === 1 ),
										this.noteModel.value,
										this.dateTimeModel,
										this.accountId,
										this.categoryModel,//UPDATE!
										this.linkedRecord,
										this.linkedAccountId,
										this.checkNum.value,
										this.transactionId,

										this.scrollAndClose.bind( this )
									 );
				} else {
					//Existing repeat

					if( !otherChanged && !repeatChanged ) {
						//Only if cleared or check num is changed

						this.editTransaction( this.descModel.value,
											this.amountModel.value,
											( this.clearedModel.value === 1 ),
											this.noteModel.value,
											this.dateTimeModel,
											this.accountId,
											this.categoryModel,//UPDATE!
											this.linkedRecord,
											this.linkedAccountId,
											this.repeatTrsn.id,
											this.repeatUnlinked,
											this.checkNum.value,

											this.transactionId,

											this.scrollAndClose.bind( this )
										 );
					} else {

						this.controller.showAlertDialog(
								{
									onChoose: function( updateChoice ) {

										this.repeat_updateItem( this.repeatTrsn,
															updateChoice + ( repeatChanged ? " r_changed" : "" ),
															this.descModel.value,
															this.amountModel.value,
															( this.clearedModel.value === 1 ),
															this.noteModel.value,
															this.dateTimeModel,
															this.accountId,
															this.categoryModel,//UPDATE!
															this.linkedRecord,
															this.linkedAccountId,
															this.checkNum.value,
															this.transactionId,

															this.scrollAndClose.bind( this )
														 );
									}.bind( this ),
									preventCancel: true,
									title: $L( "Update Transaction" ),
									message: $L( "This is a recurring transaction..." ),
									choices: [
										{
											label: $L( 'Only this instance' ),
											value: 'this'
										}, {
											label: $L( 'All events in the series' ),
											value: 'all'
										}, {
											label: $L( 'All following' ),
											value: 'future'
										}
									]
								}
							 );
					}
				}
			} else {
				//Nonrepeating or don't care if it was repeat, it isn't anymore

				this.editTransaction( this.descModel.value,
									this.amountModel.value,
									( this.clearedModel.value === 1 ),
									this.noteModel.value,
									this.dateTimeModel,
									this.accountId,
									this.categoryModel,//UPDATE!
									this.linkedRecord,
									this.linkedAccountId,
									( this.repeatTrsn.frequency === "" ? "" : this.repeatTrsn.id ),
									( this.repeatTrsn.frequency === "" ? 0 : this.repeatUnlinked ),
									this.checkNum.value,

									this.transactionId,

									this.scrollAndClose.bind( this )
								 );
			}
		}
	},

	startSpinner: function() {

		this.updateLoadingSystem( true, $L( "Saving transaction" ), $L( "Please wait..." ), 0 );
	},

	stopSpinner: function() {

		this.updateLoadingSystem( false, "", "", 0 );
	},

	deleteItem: function() {

		if( this.repeatId !== "" ) {

			this.controller.showAlertDialog(
					{
						onChoose: function( value ) {

							if( value !== 0 ) {

								this.repeat_deleteItem( this.transactionId, this.accountId, this.linkedAccountId, this.repeatTrsn.id, value, this.scrollAndClose.bind( this ) );
							}
						},
						title: $L( "Delete Transaction" ),
						message: $L( "This is a recurring transaction..." ),
						choices: [
							{
								label: $L( 'Only this instance' ),
								value: 'this',
								type: 'negative'
							}, {
								label: $L( 'All events in the series' ),
								value: 'all',
								type: 'negative'
							}, {
								label: $L( 'All following' ),
								value: 'future',
								type: 'negative'
							}, {
								label: $L( 'Cancel' ),
								value: 0
							}
						]
					}
				 );
		} else {

			this.controller.showAlertDialog(
					{
						onChoose: function( value ) {

							if( value === true ) {

								this.deleteTransaction( this.transactionId, this.accountId, this.linkedAccountId, this.scrollAndClose.bind( this ) );
							}
						},
						title: $L( "Delete" ),
						message: $L( "Are you sure you want to delete this transaction?" ),
						choices: [
							{
								label: $L( 'Delete Transaction' ),
								value: true,
								type: 'negative'
							}, {
								label: $L( 'Cancel' ),
								value: false
							}
						]
					}
				 );
		}
	},

	scrollAndClose: function() {

		if( this.amountModelOri === "NOT_A_VALUE" ) {
			//New Transactions

			this.transParent.scrollerSet['doScroll'] = true;
		}

		this.transParent.itemEdited = true;

		this.controller.stageController.popScene();
	},

	deactivate: function( event ) {

		Mojo.Event.stopListening( this.controller.get( 'description' ), Mojo.Event.propertyChange, this.descAutoSuggestDebounce );

		Mojo.Event.stopListening( this.controller.get( 'amount' ), Mojo.Event.propertyChange, this.atmModeHandler );

		Mojo.Event.stopListening( this.controller.get( 'categoryRow' ), Mojo.Event.tap, this.selectCategoryHandler );
		Mojo.Event.stopListening( this.controller.get( 'dateTimeRow' ), Mojo.Event.tap, this.selectDateTimeHandler );
		Mojo.Event.stopListening( this.controller.get( 'repeatRow' ), Mojo.Event.tap, this.selectRepeatHandler );

		Mojo.Event.stopListening( this.controller.get( 'primaryAccountParent' ), Mojo.Event.tap, this.selectAccountHandler );
		Mojo.Event.stopListening( this.controller.get( 'linkedAccountRow' ), Mojo.Event.tap, this.selectLinkedAccountHandler );

		Mojo.Event.stopListening( this.controller.get( 'amountWrapper' ), Mojo.Event.tap, this.changeFlowHandler );

		Mojo.Event.stopListening( this.controller.get( 'checkNum' ), Mojo.Event.tap, this.autoFillCheckNumEventHandler, true );
	},

	cleanup: function( event ){
	}
} );
