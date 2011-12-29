/* Copyright 2009 and forward GlitchTech Science. All rights reserved. */

var AddEditBudgetAssistant = Class.create( {

	initialize: function( planObj, itemObj ) {

		this.budgetParent = planObj;

		if( typeof( itemObj ) === "undefined" || !itemObj ) {

			this.budgetItem = {
				i: 0,
				altRow: '',

				current: "",
				limit: "",
				remaining: "",
				categoryDisp: "",
				currentStatus: "",
				value: "",
				status: "",

				//Only these are modified
				budgetId: -1,
				category: $L( "Uncategorized" ),
				category2: "%",
				spending_limit: "",
				span: 1,
				rollOver: 0,
				budgetOrder: -1
			};
		} else {

			this.budgetItem = itemObj;
		}

		this.selectCategoryHandler = this.selectCategory.bindAsEventListener( this );
		this.keyUpHandler = this.keyUp.bindAsEventListener( this );
	},

	setup: function() {

		//Need to change to a text box with auto-suggestion based on this.sceneAssistant.genCatData
		this.controller.setupWidget(
				"spending_limit",
				{
					hintText: "",
					maxLength: 15,
					modifierState: Mojo.Widget.numLock,
					charsAllow: function( charCode ) {

						return( ( charCode >= 48 && charCode <= 57) || ( charCode === 46 ) );
					},
					changeOnKeyPress: true
				},
				this.spendingLimitModel = {
					value: this.budgetItem['single_limit'],
					suggestedValue: ""
				}
			);

		this.addAccountButton = {
					visible: true,
					items: [
						{
							label: $L( 'Done' ),
							command:'saveBudget'
						}, {
							label: $L( 'Cancel' ),
							command:'abortBudget'
						}
					]
				};

		this.controller.setupWidget( Mojo.Menu.commandMenu, undefined, this.addAccountButton );

		var budgetMenuModel = {
							visible: true,
							items: [
								Mojo.Menu.editItem,
								appMenuPrefAccountsDisabled,
								appMenuFeaturesDisabled,
								cbAboutItem,
								cbHelpItem
							]
						};

		this.controller.setupWidget( Mojo.Menu.appMenu, appMenuOptions, budgetMenuModel );
	},

	ready: function() {

		this.fetchAllCategories();
	},

	//500ms before activate
	aboutToActivate: function() {

		this.controller.get( 'budgetTitle' ).update( ( this.budgetItem['budgetId'] < 0 ? $L( "New Budget" ) : $L( "Edit Budget" ) ) );
		this.controller.get( 'categoryRowLabel' ).update( $L( "Category" ) );
		this.controller.get( 'budgetLimitRowLabel' ).update( $L( "Limit" ) );
	},

	activate: function() {

		if( this.budgetItem['category'].split( "|" )[1] === "%" ) {

			this.controller.get( 'expenseCategory' ).update( this.budgetItem['category'].split( "|" )[0] );
		} else {

			this.controller.get( 'expenseCategory' ).update( this.budgetItem['category'].split( "|" )[1] );
		}

		Mojo.Event.listen( this.controller.get( 'categoryRow' ), Mojo.Event.tap, this.selectCategoryHandler );
		Mojo.Event.listen( this.controller.document, "keyup", this.keyUpHandler, true );
	},

	fetchAllCategories: function() {

		this.categoryData = {
				genCat: [],
				specCat: {}
			};

		accountsDB.transaction(
			(
				function( transaction ) {

					var catQuery = "SELECT * FROM transactionCategories ORDER BY genCat, specCat LIMIT 25 OFFSET 0;";

					transaction.executeSql( catQuery, [], this.categoryDataHandler.bind( this, "", 0 ), this.fetchError.bind( this, catQuery ) );
				}
			).bind( this ) );
	},

	categoryDataHandler: function( currCat, currItem, transaction, results ) {

		for( var i = 0; i < results.rows.length; i++ ) {

			var row = results.rows.item( i );

			if( currCat !== row['genCat'] ) {

				this.categoryData['genCat'].push(
							{
								label: row['genCat'],
								command: row['genCat'],
								iconPath: './images/rdouble.png'
							}
						);

				if( currCat !== "" ) {

					this.categoryData['specCat'][currCat].push(
								{
									label: "<img src='./images/ldouble.png' alt='&laquo;' /> " + $L( "Back" ),
									command: "|-go_back-|"
								}
							);
				}

				this.categoryData['specCat'][row['genCat']] = [];

				currCat = row['genCat'];

				this.categoryData['specCat'][currCat].push(
							{
								label: "<strong>" + row['genCat'] + "</strong>",
								command: "%"
							}
						);
			}

			this.categoryData['specCat'][currCat].push(
						{
							label: row['specCat'],
							command: row['specCat']
						}
					);
		}

		if( results.rows.length < 25 ) {

			if( currCat !== "" ) {

				this.categoryData['specCat'][currCat].push(
							{
								label: "<img src='./images/ldouble.png' alt='&laquo;' /> " + $L( "Back" ),
								command: "|-go_back-|"
							}
						);
			}
		} else {

			currItem = currItem + 25;

			var catQuery = "SELECT * FROM transactionCategories ORDER BY genCat, specCat LIMIT 25 OFFSET ?;";

			accountsDB.transaction(
				(
					function( transaction ) {

						transaction.executeSql( catQuery, [ currItem ], this.categoryDataHandler.bind( this, currCat, currItem ), this.fetchError.bind( this, catQuery ) );
					}
				).bind( this ) );
		}
	},

	handleCommand: function( event ) {

		if( event.type === Mojo.Event.back && checkbookPrefs['bsSave'] === 1 ) {

			if( this.spendingLimitModel.value === "" || Math.round( 100 * this.spendingLimitModel.value ) <= 0 ) {

				this.controller.stageController.popScene();
			} else {

				this.submitTrsnCat();
			}
			event.stop();
		}

		if( event.type === Mojo.Event.command ) {

			var command = event.command;

			switch( command ) {
				case 'saveBudget':
					this.submitTrsnCat();
					event.stop();
					break;
				case 'abortBudget':
					this.controller.stageController.popScene();
					event.stop();
					break;
			}
		}
	},

	selectCategory: function() {

		this.controller.popupSubmenu(
				{
					popupClass: "expense-category-popup",
					onChoose: this.selectSubCategory.bind( this ),
					placeNear: this.controller.get( 'categoryRowLabel' ),
					items: this.categoryData['genCat'],
					toggleCmd: this.budgetItem['category'].split( "|" )[0]
				}
			);
		event.stop();
	},

	selectSubCategory: function( choice ) {

		if( typeof( choice ) !== "undefined" && choice.length > 0 && choice != "" ) {

			this.controller.popupSubmenu(
					{
						onChoose: function( subChoice ) {

							if( typeof( subChoice ) !== "undefined" && subChoice.length > 0 && subChoice != "" ) {

								if( subChoice === "|-go_back-|" ) {

									this.selectCategory();
								} else {

									this.budgetItem['category'] = choice;
									this.budgetItem['category2'] = subChoice;

									if( subChoice === "%" ) {

										this.controller.get( 'expenseCategory' ).update( choice );
									} else {

										this.controller.get( 'expenseCategory' ).update( subChoice );
									}
								}
							}
						}.bind( this ),
						placeNear: this.controller.get( 'categoryRowLabel' ),
						items: this.categoryData['specCat'][choice],
						toggleCmd: ( ( this.budgetItem['category'].split( "|" )[0] === choice ) ? this.budgetItem['category'].split( "|" )[1] : "" )
					}
				);
		}
	},

	keyUp: function( event ) {

		if( Mojo.Char.isEnterKey( event.keyCode ) ) {

			this.submitTrsnCat();
		}
	},

	submitTrsnCat: function() {

		if( this.spendingLimitModel.value !== "" && Math.round( 100 * this.spendingLimitModel.value ) > 0 ) {

			this.budgetItem['spending_limit'] = this.spendingLimitModel.value;

			if( this.budgetItem['budgetId'] < 0 ) {

				this.budgetParent.planListAddItem( this.budgetItem );
			} else {

				this.budgetParent.planListEditItem( this.budgetItem );
			}

			this.controller.stageController.popScene();
		} else if( this.spendingLimitModel.value === "" || Math.round( 100 * this.spendingLimitModel.value ) <= 0 ) {

			Mojo.Controller.errorDialog( $L( "The limit must be greater than zero." ) );
		}
	},

	startSpinner: function() {

		this.controller.get( 'addEditBudgetSpinnerSpinner' ).mojo.start();
		Element.show( this.controller.get( 'addEditBudgetSpinnerContainer' ) );
	},

	stopSpinner: function() {

		Element.hide( this.controller.get( 'addEditBudgetSpinnerContainer' ) );
		this.controller.get( 'addEditBudgetSpinnerSpinner' ).mojo.stop();
	},

	fetchError: function( qry, transaction, error ) {

		systemError( "Add/Edit Plan Error: " + error.message + " (Code " + error.code + ") [" + qry + "]" );
	},

	deactivate: function() {

		Mojo.Event.stopListening( this.controller.get( 'categoryRow' ), Mojo.Event.tap, this.selectCategoryHandler );
		Mojo.Event.stopListening( this.controller.document, "keyup", this.keyUpHandler, true );
	},

	cleanup: function( event ) {
	}
} );
