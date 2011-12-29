/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

//Contains global information and functions for repeating system
var repeatTrsnGlobalController = {
	//Singleton

	initialize: function() {

		this.lastCheck = null;
		this.updateFutureMargin();
	},

	updateFutureMargin: function() {

		//Set future margin of items to be in DB to be 45 days in the future
		this.futureMargin = new Date();
		this.futureMargin.setDate( this.futureMargin.getDate() + 45 );
		this.futureMargin.setHours( 23, 59, 59 );
	}
};

var repeatObj = Class.create( {
	//Standard repeat obj for data transfer

	id: '',
	oId: '',

	frequency: '',
	daysOfWeek: null,
	//Object.toJSON( obj ) ==> string
	//Mojo.parseJSON( string ) ==> object

	itemSpan: '',
	endingCondition: '',

	endDate: '',
	endCount: '',
	currCount: 0
} );

var repeatTrsnController = Class.create( sqlModel, {
	//Contains scene limit information and functions for repeating system

	initialize: function( $super ) {

		$super();

		if( !repeatTrsnGlobalController || typeof( repeatTrsnGlobalController ) === "undefined" || repeatTrsnGlobalController == null ) {

			Mojo.error( "Something is very wrong with the reccurance system" );
		}
	},

	repeat_updateAll: function( callbackFn ) {

		var nowCheck = new Date();
		nowCheck.setDate( nowCheck.getDate() + 45 );
		nowCheck.setHours( 23, 59, 59 );

		if( repeatTrsnGlobalController.futureMargin <= nowCheck ) {

			//Insert new transactions
			//get all items in the repeat system that are not overlimit
				//Loop through them all
					//while( !repeat_overLimit( curr_repeat_obj, curr_date ) ) { INSERT ITEM INTO DB }

			this.lastCheck = nowCheck;

			repeatTrsnGlobalController.updateFutureMargin();
		}

		if( callbackFn && typeof( callbackFn ) === "function" ) {

			callbackFn();
		}
	},

	repeat_newItem: function( repeatTrsnObj, transId, desc, amount, cleared, note, dateTime, acctId, category, linkedAcctId, checkNum, autoTrsn, autoTrsnLink, callbackFn ) {
		//Adapt for split transactions

		Mojo.Log.error( "TESTING 2" );

		accountsDB.transaction(
			(
				function( transaction ) {

					var qryInsertRepeat = "INSERT INTO repeats( repeatId, frequency, daysOfWeek, itemSpan, endingCondition, endDate, endCount, currCout, origDate, lastOccurance, desc, amount, note, category, acctId, linkedAcctId, autoTrsnLink ) VALUES( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? );";

					transaction.executeSql(
							qryInsertRepeat,
							[
								repeatTrsnObj.id,
								repeatTrsnObj.frequency,
								Object.toJSON( repeatTrsnObj.daysOfWeek ),
								repeatTrsnObj.itemSpan,
								repeatTrsnObj.endingCondition,
								repeatTrsnObj.endDate,
								repeatTrsnObj.endCount,
								0,
								dateTime,
								"",
								desc,
								amount,
								note,
								formatCategory( category, false ),
								acctId,
								linkedAcctId,
								( autoTrsn > 0 ? autoTrsnLink : "" )
							],
							this.repeat_cycleAdd.bind( this, repeatTrsnObj, transId, desc, amount, cleared, note, dateTime, acctId, category, linkedAcctId, checkNum, autoTrsn, autoTrsnLink, callbackFn ),
							this.sqlError.bind( this, callbackFn, "insert repeat item", qryInsertRepeat )
						);
				}
			).bind( this ) );
	},

	repeat_cycleAdd: function( repeatTrsnObj, transId, desc, amount, cleared, note, dateTime, acctId, category, linkedAcctId, checkNum, autoTrsn, autoTrsnLink, callbackFn, trsn, results ) {

		if( !this.repeat_overLimit( repeatTrsnObj, dateTime ) ) {

			if( linkedAcctId && !isNaN( linkedAcctId ) && linkedAcctId !== "" && linkedAcctId >= 0 ) {

				transId = transId + 2;
			} else {

				transId = transId + 1;
			}

			this.addTransaction(
						transId,
						desc,
						amount,
						( repeatTrsnObj.currCount <= 0 ? cleared : false ),
						note,
						dateTime,
						acctId,
						category,
						linkedAcctId,
						repeatTrsnObj.id,
						( repeatTrsnObj.currCount <= 0 ? checkNum : "" ),
						autoTrsn,
						autoTrsnLink,
						this.repeat_cycleAdd_callback1.bind( this, repeatTrsnObj, transId, desc, amount, cleared, note, dateTime, acctId, category, linkedAcctId, checkNum, callbackFn )
					);
		} else {

			if( callbackFn && typeof( callbackFn ) === "function" ) {

				callbackFn();
			}
		}
	},

	repeat_cycleAdd_callback1: function( repeatTrsnObj, transId, desc, amount, cleared, note, dateTime, acctId, category, linkedAcctId, checkNum, autoTrsn, autoTrsnLink, callbackFn ) {

		accountsDB.transaction(
			(
				function( transaction ) {

					repeatTrsnObj.currCount++;

					var qryUpdateRepeat = "UPDATE repeats SET currCout = ?, lastOccurance = ? WHERE repeatId = ?;";

					transaction.executeSql(
							qryUpdateRepeat,
							[
								repeatTrsnObj.currCount,
								dateTime,
								repeatTrsnObj.id
							],
							this.repeat_cycleAdd_callback2.bind( this, repeatTrsnObj, transId, desc, amount, cleared, note, dateTime, acctId, category, linkedAcctId, checkNum, autoTrsn, autoTrsnLink, callbackFn ),
							this.sqlError.bind( this, callbackFn, "update repeat item", qryUpdateRepeat )
						);
				}
			).bind( this ) );
	},

	repeat_cycleAdd_callback2: function( repeatTrsnObj, transId, desc, amount, cleared, note, dateTime, acctId, category, linkedAcctId, checkNum, autoTrsn, autoTrsnLink, callbackFn, trsn, results ) {

		dateTime = new Date( parseInt( dateTime ) );
		dateTime = this.repeat_getNextOccurance( repeatTrsnObj, dateTime );
		dateTime = Date.parse( dateTime );

		this.repeat_cycleAdd(
			repeatTrsnObj,
			transId,
			desc,
			amount,
			cleared,
			note,
			dateTime,
			acctId,
			category,
			linkedAcctId,
			checkNum,
			autoTrsn,
			autoTrsnLink,
			callbackFn,
			null,
			null
		);
	},

	repeat_updateItem: function( repeatTrsnObj, mode, desc, amount, cleared, note, dateTime, acctId, category, linkTransId, linkedAcctId, checkNum, transId, callbackFn ) {

		if( mode === 'new' ) {

			//Existing transaction changed into a repeating transaction
			this.editTransaction(
						desc,
						amount,
						cleared,
						note,
						dateTime,
						acctId,
						category,
						linkTransId,
						linkedAcctId,
						repeatTrsnObj.id,
						0,
						checkNum,
						transId,
						this.repeat_updateItem_new_1.bind( this, repeatTrsnObj, mode, desc, amount, cleared, note, dateTime, acctId, category, linkTransId, linkedAcctId, checkNum, transId, callbackFn )
					);
		} else if( mode === 'this' ) {

			//Repeating, but changed by itself. Will no longer be updated with the rest of the group
			this.editTransaction( desc, amount, cleared, note, dateTime, acctId, category, linkTransId, linkedAcctId, repeatTrsnObj.id, 1, checkNum, transId, callbackFn );
		} else if( mode === 'all r_changed' ) {

			//all linked + repeat item (go to first date, delete all, restart)
			accountsDB.transaction(
				(
					function( transaction ) {

						var qryRepeat = "SELECT origDate FROM repeats WHERE repeatId = ? LIMIT 1;";

						transaction.executeSql(
								qryRepeat,
								[
									repeatTrsnObj.id
								],
								this.repeat_updateItem_all_r_changed_1.bind( this, repeatTrsnObj, mode, desc, amount, cleared, note, dateTime, acctId, category, linkedAcctId, checkNum, transId, callbackFn ),
								this.sqlError.bind( this, callbackFn, "find repeat item (edit)", qryRepeat )
							);
					}
				).bind( this ) );
		} else if( mode === 'all' ) {
			//Adapt for split transactions

			//all linked + repeat item (update all transactions sharing repeat id minus repeatUnlinked = 1)
			accountsDB.transaction(
				(
					function( transaction ) {

						var qryInsertRepeat = "UPDATE repeats SET desc = ?, amount = ?, note = ?, category = ?, acctId = ?, linkedAcctId = ? WHERE repeatId = ?;";

						transaction.executeSql(
								qryInsertRepeat,
								[
									desc,
									amount,
									note,
									formatCategory( category, false),
									acctId,
									linkedAcctId,

									repeatTrsnObj.id
								],
								this.successHandler.bind( this ),
								this.sqlError.bind( this, callbackFn, "update repeat item", qryInsertRepeat )
							);

						var qryRepeatTrsnUpdate = "UPDATE transactions SET desc = ?, amount = ?, note = ?, account = ?, category = ?, linkedAccount = ? WHERE account = ? AND repeatId = ? AND repeatUnlinked = 0;";

						if( linkedAcctId && !isNaN( linkedAcctId ) && linkedAcctId !== "" && linkedAcctId >= 0 ) {

							transaction.executeSql(
									qryRepeatTrsnUpdate,
									[
										desc,
										-amount,
										note,
										acctId,
										formatCategory( category, false ),
										linkedAcctId,

										acctId,
										repeatTrsnObj.id
									],
									this.successHandler.bind( this ),
									this.sqlError.bind( this, callbackFn, "update source transfer", qryRepeatTrsnUpdate )
								);

							transaction.executeSql(
									qryRepeatTrsnUpdate,
									[
										desc,
										amount,
										note,
										linkedAcctId,
										formatCategory( category, false ),
										acctId,

										linkedAcctId,
										repeatTrsnObj.id
									],
									this.transactionChangeHandler.bind( this, acctId, linkedAcctId, callbackFn ),
									this.sqlError.bind( this, callbackFn, "update dest transfer", qryRepeatTrsnUpdate )
								);
						} else {

							transaction.executeSql(
									qryRepeatTrsnUpdate,
									[
										desc,
										amount,
										note,
										acctId,
										formatCategory( category, false ),
										linkedAcctId,

										acctId,
										repeatTrsnObj.id
									],
									this.transactionChangeHandler.bind( this, acctId, null, callbackFn ),
									this.sqlError.bind( this, callbackFn, "update transaction", qryRepeatTrsnUpdate )
								);
						}
					}
				).bind( this ) );
		} else if( mode === 'future r_changed' ) {

			//current item + repeat item (go to most this date, delete this + all future, restart)
			accountsDB.transaction(
				(
					function( transaction ) {

						var delRepeat = "DELETE FROM transactions WHERE repeatId = ? AND CAST( date AS INTEGER ) >= ? AND itemId != ?;";

						transaction.executeSql(
								delRepeat,
								[
									repeatTrsnObj.id,
									dateTime,
									transId
								],
								this.repeat_updateItem_future_r_changed_1.bind( this, repeatTrsnObj, desc, amount, cleared, note, dateTime, acctId, category, linkedAcctId, checkNum, transId, callbackFn ),
								this.sqlError.bind( this, callbackFn, "delete repeat transactions (edit)", delRepeat )
							);
					}
				).bind( this ) );

		} else if( mode === 'future' ) {
			//Adapt for split transactions

			//current item + repeat item (update all future (+this) transactions sharing repeat id minus repeatUnlinked = 1)
			accountsDB.transaction(
				(
					function( transaction ) {

						var qryInsertRepeat = "UPDATE repeats SET desc = ?, amount = ?, note = ?, category = ?, acctId = ?, linkedAcctId = ? WHERE repeatId = ?;";

						transaction.executeSql(
								qryInsertRepeat,
								[
									desc,
									amount,
									note,
									formatCategory( category, false),
									acctId,
									linkedAcctId,

									repeatTrsnObj.id
								],
								this.successHandler.bind( this ),
								this.sqlError.bind( this, callbackFn, "update repeat item (future)", qryInsertRepeat )
							);

						var qryRepeatTrsnUpdate = "UPDATE transactions SET desc = ?, amount = ?, note = ?, account = ?, category = ?, linkedAccount = ? WHERE account = ? AND repeatId = ? AND CAST( date AS INTEGER ) >= ? AND repeatUnlinked = 0;";

						if( linkedAcctId && !isNaN( linkedAcctId ) && linkedAcctId !== "" && linkedAcctId >= 0 ) {

							transaction.executeSql(
									qryRepeatTrsnUpdate,
									[
										desc,
										-amount,
										note,
										acctId,
										formatCategory( category, false ),
										linkedAcctId,

										acctId,
										repeatTrsnObj.id,
										dateTime
									],
									this.successHandler.bind( this ),
									this.sqlError.bind( this, callbackFn, "update source transfer", qryRepeatTrsnUpdate )
								);

							transaction.executeSql(
									qryRepeatTrsnUpdate,
									[
										desc,
										amount,
										note,
										linkedAcctId,
										formatCategory( category, false ),
										acctId,

										linkedAcctId,
										repeatTrsnObj.id,
										dateTime
									],
									this.transactionChangeHandler.bind( this, acctId, linkedAcctId, callbackFn ),
									this.sqlError.bind( this, callbackFn, "update dest transfer", qryRepeatTrsnUpdate )
								);
						} else {

							transaction.executeSql(
									qryRepeatTrsnUpdate,
									[
										desc,
										amount,
										note,
										acctId,
										formatCategory( category, false ),
										linkedAcctId,

										acctId,
										repeatTrsnObj.id,
										dateTime
									],
									this.transactionChangeHandler.bind( this, acctId, null, callbackFn ),
									this.sqlError.bind( this, callbackFn, "update transaction", qryRepeatTrsnUpdate )
								);
						}
					}
				).bind( this ) );
		} else {

			//bad data, goto callback
			if( callbackFn && typeof( callbackFn ) === "function" ) {

				callbackFn();
			}
		}
	},

	repeat_updateItem_new_1: function( repeatTrsnObj, mode, desc, amount, cleared, note, dateTime, acctId, category, linkTransId, linkedAcctId, checkNum, transId, callbackFn ) {
		//Adapt for split transactions

		accountsDB.transaction(
			(
				function( transaction ) {

					repeatTrsnObj.currCount = 1;

					var qryInsertRepeat = "INSERT INTO repeats( repeatId, frequency, daysOfWeek, itemSpan, endingCondition, endDate, endCount, currCout, origDate, lastOccurance, desc, amount, note, category, acctId, linkedAcctId ) VALUES( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? );";

					transaction.executeSql(
							qryInsertRepeat,
							[
								repeatTrsnObj.id,
								repeatTrsnObj.frequency,
								Object.toJSON( repeatTrsnObj.daysOfWeek ),
								repeatTrsnObj.itemSpan,
								repeatTrsnObj.endingCondition,
								repeatTrsnObj.endDate,
								repeatTrsnObj.endCount,
								repeatTrsnObj.currCount,
								dateTime,
								dateTime,
								desc,
								amount,
								note,
								formatCategory( category, false ),
								acctId,
								linkedAcctId
							],
							this.repeat_cycleAdd_callback2.bind( this, repeatTrsnObj, transId, desc, amount, cleared, note, dateTime, acctId, category, linkedAcctId, checkNum, callbackFn ),
							this.sqlError.bind( this, callbackFn, "repeat_updateItem_new_1", qryInsertRepeat )
						);
				}
			).bind( this ) );
	},

	repeat_updateItem_all_r_changed_1: function( repeatTrsnObj, mode, desc, amount, cleared, note, dateTime, acctId, category, linkedAcctId, checkNum, transId, callbackFn, transaction, results ) {

		//Set object to use origional date or start from current date if not found
		try {

			dateTime = resultsObj.rows.item( 0 )['origDate'];
		} catch( err ) {

			dateTime = Date.parse( Date() );
		}

		//delete all trsn with repeat id, send to create new area
		accountsDB.transaction(
			(
				function( transaction ) {

					var delRepeat = "DELETE FROM transactions WHERE repeatId = ?;";

					transaction.executeSql(
							delRepeat,
							[
								repeatTrsnObj.id
							],
							this.repeat_updateItem_all_r_changed_2.bind( this, repeatTrsnObj, mode, desc, amount, cleared, note, dateTime, acctId, category, linkedAcctId, checkNum, transId, callbackFn ),
							this.sqlError.bind( this, callbackFn, "delete repeat trsns (edit)", delRepeat )
						);
				}
			).bind( this ) );
	},

	repeat_updateItem_all_r_changed_2: function( repeatTrsnObj, mode, desc, amount, cleared, note, dateTime, acctId, category, linkedAcctId, checkNum, transId, callbackFn, transaction, results ) {

		//Get the max expense ID
		accountsDB.transaction(
			(
				function( transaction ) {

					var maxIdQry = "SELECT IFNULL( MAX( itemId ), 0 ) AS maxRowId FROM transactions LIMIT 1;"

					transaction.executeSql(
							maxIdQry,
							[],
							this.repeat_updateItem_all_r_changed_3.bind( this, repeatTrsnObj, mode, desc, amount, cleared, note, dateTime, acctId, category, linkedAcctId, checkNum, transId, callbackFn ),
							this.sqlError.bind( this, callbackFn, "max id (edit)", maxIdQry )
						);
				}
			).bind( this ) );
	},

	repeat_updateItem_all_r_changed_3: function( repeatTrsnObj, mode, desc, amount, cleared, note, dateTime, acctId, category, linkedAcctId, checkNum, transId, callbackFn, transaction, results ) {

		var itemId = 0;

		try {

			itemId = ( results.rows.length > 0 ? results.rows.item( 0 )['maxRowId'] + 1 : 0 );
		} catch( err ) {

			itemId = transId;
		}

		Mojo.Log.error( "repeat_updateItem_all_r_changed_3" );

		//Delete repeat obj from database
		accountsDB.transaction(
			(
				function( transaction ) {

					var delRepeat = "DELETE FROM repeats WHERE repeatId = ?;";

					transaction.executeSql(
							delRepeat,
							[
								repeatTrsnObj.id
							],
							this.repeat_newItem.bind( this,
												repeatTrsnObj,
												itemId,
												desc,
												amount,
												cleared,
												note,
												dateTime,
												acctId,
												category,
												linkedAcctId,
												checkNum,

												callbackFn ),
							this.sqlError.bind( this, callbackFn, "delete repeat obj (edit)", delRepeat )
						);
				}
			).bind( this ) );
	},

	repeat_updateItem_future_r_changed_1: function( repeatTrsnObj, desc, amount, cleared, note, dateTime, acctId, category, linkedAcctId, checkNum, transId, callbackFn, transaction, results ) {
		//Adapt for split transactions

		//edit repeat db item
		accountsDB.transaction(
			(
				function( transaction ) {

						var qryInsertRepeat = "UPDATE repeats SET frequency = ?, daysOfWeek = ?, itemSpan = ?, endingCondition = ?, endDate = ?, endCount = ?, lastOccurance = ?, desc = ?, amount = ?, note = ?, category = ?, acctId = ?, linkedAcctId = ? WHERE repeatId = ?;";

						transaction.executeSql(
								qryInsertRepeat,
								[
									repeatTrsnObj.frequency,
									Object.toJSON( repeatTrsnObj.daysOfWeek ),
									repeatTrsnObj.itemSpan,
									repeatTrsnObj.endingCondition,
									repeatTrsnObj.endDate,
									repeatTrsnObj.endCount,
									dateTime,
									desc,
									amount,
									note,
									formatCategory( category, false ),
									acctId,
									linkedAcctId,

									repeatTrsnObj.id,
								],
								this.editTransaction.bind( this,
														desc,
														amount,
														cleared,
														note,
														dateTime,
														acctId,
														category,
														linkTransId,
														linkedAcctId,
														repeatTrsnObj.id,
														0,
														checkNum,
														transId,
														this.repeat_updateItem_future_r_changed_2.bind( this,
																										repeatTrsnObj,
																										desc,
																										amount,
																										cleared,
																										note,
																										dateTime,
																										acctId,
																										category,
																										linkedAcctId,
																										checkNum,
																										transId,
																										callbackFn
																									)
													),
								this.sqlError.bind( this, callbackFn, "repeat_updateItem_future_r_changed_1 (edit)", delRepeat )
						);
				}
			).bind( this ) );
	},

	repeat_updateItem_future_r_changed_2: function( repeatTrsnObj, desc, amount, cleared, note, dateTime, acctId, category, linkedAcctId, checkNum, transId, callbackFn, transaction, results ) {

		accountsDB.transaction(
			(
				function( transaction ) {

					var qryUpdateRepeat = "UPDATE repeats SET currCout = ?, lastOccurance = ? WHERE repeatId = ?;";

					transaction.executeSql(
							qryUpdateRepeat,
							[
								repeatTrsnObj.currCount,
								dateTime,
								repeatTrsnObj.id
							],
							function( transaction, results ) {

								dateTime = new Date( parseInt( dateTime ) );
								dateTime = this.repeat_getNextOccurance( repeatTrsnObj, dateTime );
								dateTime = Date.parse( dateTime );

								this.repeat_cycleAdd(
									repeatTrsnObj,
									transId,
									desc,
									amount,
									cleared,
									note,
									dateTime,
									acctId,
									category,
									linkedAcctId,
									checkNum,
									callbackFn,
									null,
									null
								);
							}.bind( this ),
							this.sqlError.bind( this, callbackFn, "repeat_updateItem_future_r_changed_2", qryUpdateRepeat )
						);
				}
			).bind( this ) );
	},

	repeat_deleteItem: function( itemId, acct, linkAcct, repeatId, mode, callbackFn ) {

		if( mode == 'all' ) {

			//all linked + repeat item
		} else if( mode == 'future' ) {

			//current item + repeat item
		} else {

			//this & bad data
		}

		if( callbackFn && typeof( callbackFn ) === "function" ) {

			callbackFn();
		}
	},

	//Input: repeat object, current date item to increast
	//Output: next event date item or null if finished or invalid
	repeat_getNextOccurance: function( repeatTrsnObj, nextDate ) {

		if( repeatTrsnObj.frequency === $L( 'day(s)' ) ) {

			nextDate.setDate( nextDate.getDate() + ( 1 * repeatTrsnObj.itemSpan ) );
		} else if( repeatTrsnObj.frequency === $L( 'week(s)' ) ) {

			//Ending condition check
			if(
				( repeatTrsnObj.endingCondition === 'd' && Date.parse( repeatTrsnObj.endDate ) < Date.parse( nextDate ) ) ||
				( Date.parse( nextDate ) > this.future_margin ) ) {

				return null;
			} else if( repeatTrsnObj.daysOfWeek['SU'] == "0" &&
						repeatTrsnObj.daysOfWeek['MO'] == "0" &&
						repeatTrsnObj.daysOfWeek['TU'] == "0" &&
						repeatTrsnObj.daysOfWeek['WE'] == "0" &&
						repeatTrsnObj.daysOfWeek['TH'] == "0" &&
						repeatTrsnObj.daysOfWeek['FR'] == "0" &&
						repeatTrsnObj.daysOfWeek['SA'] == "0" ) {

				//Update date to remove from repeat checks
				var qryUpdateRepeat = "UPDATE repeats SET endingDate, lastCheck = ? WHERE repeatId = ?;";

				transaction.executeSql(
							qryUpdateRepeat,
							[
								Date.parse( nextDate ),
								Date.parse( nextDate ),
								repeatTrsnObj.id
							],
							this.successHandler.bind( this ),
							this.sqlError.bind( this, qryUpdateRepeat )
						);

				return null;
			} else {

				var tlDay = "SU";

				var errorBlock = 0;

				do {

					if( repeatTrsnObj.endingCondition === 'd' && Date.parse( repeatTrsnObj.endDate ) < Date.parse( nextDate ) ) {

						//Update date to remove from repeat checks
						var qryUpdateRepeat = "UPDATE repeats SET repeatCount = ?, lastCheck = ? WHERE repeatId = ?;";

						transaction.executeSql(
									qryUpdateRepeat,
									[
										repeatTrsnObj.currCount,
										Date.parse( nextDate ),
										repeatTrsnObj.id
									],
									this.successHandler.bind( this ),
									this.sqlError.bind( this, qryUpdateRepeat )
								);

						return null;
					} else {

						if( nextDate.getDay() === 6 ) {

							nextDate.setDate( nextDate.getDate() - 6 );//Return to Sunday
							nextDate.setDate( nextDate.getDate() + ( 7 * repeatTrsnObj.itemSpan ) );
						} else {

							nextDate.setDate( nextDate.getDate() + 1 );
						}

						switch( nextDate.getDay() ) {
							case 0:
								tlDay = "SU";
								break;
							case 1:
								tlDay = "MO";
								break;
							case 2:
								tlDay = "TU";
								break;
							case 3:
								tlDay = "WE";
								break;
							case 4:
								tlDay = "TH";
								break;
							case 5:
								tlDay = "FR";
								break;
							case 6:
								tlDay = "SA";
								break;
						}
					}

					errorBlock++;
				} while( ( repeatTrsnObj.daysOfWeek[tlDay] == "0" ) && errorBlock < 7 );
			}
		} else if( repeatTrsnObj.frequency === $L( 'month(s)' ) ) {

			if( nextDate.getDate() > 27 ) {
				//Watch for overflow

				//Create copy
				var nextEvent = new Date();
				nextEvent.setTime( nextDate.getTime() );

				var nextMonthDays = daysInMonth( ( nextEvent.getMonth() + 1 ), nextEvent.getFullYear() );

				if( nextDate.getDate() > nextEvent.getDate() &&
					nextDate.getDate() <= nextMonthDays ) {
					//Item was shifted, enough days

					nextEvent.setMonth( nextEvent.getMonth() + ( 1 * repeatTrsnObj.itemSpan ) );
					nextEvent.setDate( nextDate.getDate() );
				} else if( nextDate.getDate() > nextEvent.getDate() &&
					nextDate.getDate() > nextMonthDays ) {
					//Item was shifted, not enough days

					nextEvent.setDate( nextMonthDays );
					nextEvent.setMonth( nextEvent.getMonth() + ( 1 * repeatTrsnObj.itemSpan ) );
				} else if( nextDate.getDate() === nextEvent.getDate() &&
					nextDate.getDate() > nextMonthDays ) {
					//Item not shifted, not enough days

					nextEvent.setDate( nextMonthDays );
					nextEvent.setMonth( nextEvent.getMonth() + ( 1 * repeatTrsnObj.itemSpan ) );
				} else {
					//Item not shifted, enough days

					nextEvent.setMonth( nextEvent.getMonth() + ( 1 * repeatTrsnObj.itemSpan ) );
				}

				//Copy data back
				nextDate.setTime( nextEvent.getTime() );
			} else {

				nextDate.setMonth( nextDate.getMonth() + ( 1 * repeatTrsnObj.itemSpan ) );
			}
		} else if( repeatTrsnObj.frequency === $L( 'year(s)' ) ) {

			nextDate.setFullYear( nextDate.getFullYear() + ( 1 * repeatTrsnObj.itemSpan ) );
		}

		return nextDate;
	},

	repeat_overLimit: function( repeatTrsnObj, dateCheck ) {

		var itemExceededLimits = false;

		//Internal Limits
		if( repeatTrsnObj.endingCondition === 'd' && repeatTrsnObj.endDate < dateCheck ) {

			itemExceededLimits = true;
		} else if(repeatTrsnObj.endingCondition === 'o' && repeatTrsnObj.currCount >= repeatTrsnObj.endCount ) {

			itemExceededLimits = true;
		}

		//Display Limits
		if( dateCheck > Date.parse( repeatTrsnGlobalController.futureMargin ) ) {

			itemExceededLimits = true;
		}

		return itemExceededLimits;
	}
} );