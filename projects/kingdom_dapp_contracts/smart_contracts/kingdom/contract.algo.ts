import {
  Account,
  arc4,
  assert,
  BoxMap,
  Bytes,
  compile,
  Contract,
  GlobalState,
  gtxn,
  itxn,
  uint64,
} from '@algorandfoundation/algorand-typescript'
import { AppGlobal, Global, Txn } from '@algorandfoundation/algorand-typescript/op'
import { KingdomTreasury } from '../kingdom_treasury/contract.algo'

export class Kingdom extends Contract {
  MAX_TOKEN_SUPPLY = GlobalState<uint64>()
  INITIAL_SUPPLY = GlobalState<uint64>()
  INITIAL_PRICE = GlobalState<uint64>()
  TREASURY_APP_ID = GlobalState<uint64>()
  TREASURY_APP_ADDRESS = GlobalState<Account>()
  REALM_APP_ID = GlobalState<uint64>()
  project_token = GlobalState<uint64>()
  project_name = GlobalState<arc4.Str>()
  project_creator = GlobalState<arc4.Address>()
  project_image_url = GlobalState<arc4.Str>()
  total_funded = GlobalState<uint64>()
  project_description = GlobalState<arc4.Str>()
  project_primary_color = GlobalState<arc4.Str>()
  project_secondary_color = GlobalState<arc4.Str>()
  project_background_color = GlobalState<arc4.Str>()
  project_accent_color = GlobalState<arc4.Str>()
  project_text_color = GlobalState<arc4.Str>()

  user_funded = BoxMap<Account, uint64>({ keyPrefix: '_f' })

  /**
   * @param appId The appId of the repo contract
   * @param appAddress The address of the repo contract
   * @param projectName The name of the project
   * @param unitName The unit name of the token
   */
  public createKingdom(
    projectName: arc4.Str,
    projectDescription: arc4.Str,
    tokenName: arc4.Str,
    tokenSymbol: arc4.Str,
    projectImage: arc4.Str,
    projectPrmaryColor: arc4.Str,
    projectSecondaryColor: arc4.Str,
    projectBackgroundColor: arc4.Str,
    projectAccentColor: arc4.Str,
    projectTextColor: arc4.Str,
    repoId: uint64,
  ): void {
    this.MAX_TOKEN_SUPPLY.value = 1000000 * 10 ** 6
    this.INITIAL_SUPPLY.value = 800000 * 10 ** 6
    this.TREASURY_APP_ID.value = 0
    this.project_name.value = projectName
    this.project_image_url.value = projectImage
    this.project_creator.value = new arc4.Address(Txn.sender)
    this.REALM_APP_ID.value = repoId
    this.project_description.value = projectDescription
    this.project_primary_color.value = projectPrmaryColor
    this.project_secondary_color.value = projectSecondaryColor
    this.project_background_color.value = projectBackgroundColor
    this.project_accent_color.value = projectAccentColor
    this.project_text_color.value = projectTextColor

    this.total_funded.value = 0
    this.project_token.value = this.createProjectToken(tokenSymbol)

    const compiled = compile(KingdomTreasury)

    assert(compiled.approvalProgram[0], 'Compiled programs must not be empty')
    // // //In a real implementation, you would compile the WeProject contract and use its bytecode
    const appTxn = itxn
      .applicationCall({
        approvalProgram: compiled.approvalProgram,
        clearStateProgram: compiled.clearStateProgram,
        fee: 0,
        globalNumBytes: 10,
        globalNumUint: 7,
        localNumBytes: 0,
        localNumUint: 1,
      })
      .submit()

    this.TREASURY_APP_ADDRESS.value = appTxn.createdApp.address
    this.TREASURY_APP_ID.value = appTxn.createdApp.id
    itxn
      .payment({ sender: Global.currentApplicationAddress, receiver: appTxn.createdApp.address, amount: 210_000 })
      .submit()

    this.setupTreasury()

    // itxn
    //   .applicationCall({
    //     onCompletion: OnCompleteAction.OptIn,
    //     appId: this.REALM_APP_ID.value,
    //     fee: 0,
    //     sender: Global.currentApplicationAddress,
    //   })
    //   .submit()
  }

  public setupTreasury(): void {
    itxn
      .applicationCall({
        appArgs: [
          arc4.methodSelector(KingdomTreasury.prototype.setupKingdomTreasury),
          new arc4.UintN64(Global.currentApplicationId.id),
          new arc4.UintN64(this.project_token.value),
        ],
        appId: this.TREASURY_APP_ID.value,
        fee: 0,
        sender: Global.currentApplicationAddress,
      })
      .submit()
    itxn
      .assetTransfer({
        xferAsset: this.project_token.value,
        assetReceiver: this.TREASURY_APP_ADDRESS.value,
        assetAmount: this.MAX_TOKEN_SUPPLY.value - this.INITIAL_SUPPLY.value,
      })
      .submit()
  }

  /*
   * @param unitName The unit name of the token
   */
  private createProjectToken(unitName: arc4.Str): uint64 {
    const createdAsset = itxn
      .assetConfig({
        assetName: this.project_name.value.native,
        decimals: 6,
        total: this.MAX_TOKEN_SUPPLY.value,
        unitName: unitName.native,
      })
      .submit().createdAsset

    this.project_token.value = createdAsset.id

    return createdAsset.id
  }

  /*
   * @param purchaseTxn The transaction to purchase tokens
   */
  public purchaseTokens(purchaseTxn: gtxn.PaymentTxn): void {
    this.notFundedYet(purchaseTxn)
    this.enoughPurchaseValue(purchaseTxn)
    this.enoughPurcheasableSupply(purchaseTxn.amount)

    this.total_funded.value = this.total_funded.value + purchaseTxn.amount

    this.user_funded(purchaseTxn.sender).create()

    this.user_funded(purchaseTxn.sender).value = this.user_funded(purchaseTxn.sender).value + purchaseTxn.amount
  }

  public claimTokens() {
    this.isInvestor()
  }

  // Modifiers -------------------------------------------------
  /**
   * @param purchaseTxn The transaction to pay the project creation fee
   * @throws Error if the fee is not enough
   */
  private enoughPurchaseValue(purchaseTxn: gtxn.PaymentTxn): void {
    const [minPurchaseAmount, didExist] = AppGlobal.getExUint64(this.REALM_APP_ID.value, Bytes('min_purchase_amount'))
    assert(purchaseTxn.amount >= minPurchaseAmount, 'Not enough purchase amount')
  }

  private notFundedYet(purchaseTxn: gtxn.PaymentTxn): void {
    const [minPurchaseAmount, didExist] = AppGlobal.getExUint64(this.REALM_APP_ID.value, Bytes('funding_goal_1'))
    assert(this.total_funded.value + purchaseTxn.amount <= minPurchaseAmount, 'Project already funded')
  }

  private isInvestor(): void {
    assert(this.user_funded(Txn.sender).exists, 'Not an investor')
  }

  private enoughPurcheasableSupply(amount: uint64): void {
    assert(amount <= this.MAX_TOKEN_SUPPLY.value, 'Not enough purchasable supply')
  }
  // -------------------------------------------------
}
