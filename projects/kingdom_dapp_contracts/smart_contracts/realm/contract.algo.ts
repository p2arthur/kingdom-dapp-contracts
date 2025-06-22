import {
  Account,
  arc4,
  assert,
  BoxMap,
  compile,
  Contract,
  Global,
  GlobalState,
  gtxn,
  itxn,
  LocalState,
  Txn,
  uint64,
} from '@algorandfoundation/algorand-typescript'
import { abimethod } from '@algorandfoundation/algorand-typescript/arc4'
import { Kingdom } from '../kingdom/contract.algo'
import { KingdomDataType, KingdomIdType } from './config.algo'

export class Realm extends Contract {
  MANAGER_ADDRESS = GlobalState<arc4.Address>()
  total_kingdoms = GlobalState<uint64>()
  project_creation_fee = GlobalState<uint64>()
  funding_goal_1 = GlobalState<uint64>()
  min_purchase_amount = GlobalState<uint64>()
  project_contribution = LocalState<uint64>()
  kingdoms = BoxMap<KingdomIdType, KingdomDataType>({ keyPrefix: '_k' })

  public createApplication() {
    this.MANAGER_ADDRESS.value = new arc4.Address(Txn.sender)
    this.total_kingdoms.value = 0
    this.project_creation_fee.value = 1000000
    this.funding_goal_1.value = 100000000
    this.min_purchase_amount.value = 10000000
  }

  @abimethod({ allowActions: 'OptIn' })
  public optinToApplication() {
    // Initialize project_contribution for the sender to 0 on opt-in
    this.project_contribution(Txn.sender).value = 0
  }

  /*
   * @param projectName The name of the project
   * @param feeTransaction The transaction to pay the project creation fee
   * @throws Error if the fee is not enough
   */
  public createKingdom(
    projectName: arc4.Str,
    projectDescription: arc4.Str,
    tokenName: arc4.Str,
    tokenSymbol: arc4.Str,
    kingdomImage: arc4.Str,
    kingdomPrmaryColor: arc4.Str,
    kingdomSecondaryColor: arc4.Str,
    kingdomBackgroundColor: arc4.Str,
    kingdomAccentColor: arc4.Str,
    kingdomTextColor: arc4.Str,
    feeTransaction: gtxn.PaymentTxn,
  ): KingdomIdType {
    // this.enoughProjectCreationFee(feeTransaction)

    const { appId, appAddress } = this.deployKingdomContract()
    const kingdomId = new KingdomIdType({ appId: new arc4.UintN64(appId) })
    this.kingdoms(new KingdomIdType({ appId: new arc4.UintN64(appId) })).value = new KingdomDataType({
      kingdomContribution: new arc4.UintN64(10),
    })
    this.setupKingdom(
      appId,
      appAddress,
      projectName,
      projectDescription,
      tokenName,
      tokenSymbol,
      kingdomImage,
      kingdomPrmaryColor,
      kingdomSecondaryColor,
      kingdomBackgroundColor,
      kingdomAccentColor,
      kingdomTextColor,
    )
    this.total_kingdoms.value = this.total_kingdoms.value + 1
    this.project_contribution(Txn.sender).value += 10
    return kingdomId
  }
  // -------------------------------------------------

  /*
   * @param projectId The id of the project
   * @param purchaseTxn The transaction to purchase tokens
   */
  // -------------------------------------------------
  private deployKingdomContract(): { appId: uint64; appAddress: Account } {
    const compiled = compile(Kingdom)

    //In a real implementation, you would compile the WeProject contract and use its bytecode
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
    return { appId: appTxn.createdApp.id, appAddress: appTxn.createdApp.address }
  }

  private setupKingdom(
    appId: uint64,
    appAddress: Account,
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
  ): void {
    itxn.payment({ amount: 1400000, receiver: appAddress }).submit()
    itxn
      .applicationCall({
        appArgs: [
          arc4.methodSelector(Kingdom.prototype.createKingdom),
          projectName,
          projectDescription,
          tokenName,
          tokenSymbol,
          projectImage,
          projectPrmaryColor,
          projectSecondaryColor,
          projectBackgroundColor,
          projectAccentColor,
          projectTextColor,
          Global.currentApplicationId,
        ],
        appId: appId,
        fee: 0,
        sender: Global.currentApplicationAddress,
      })
      .submit()
  }

  // Modifiers --------------------------------
  private enoughProjectCreationFee(feeTransaction: gtxn.PaymentTxn): void {
    assert(feeTransaction.amount >= this.project_creation_fee.value, 'Not enough project creation fee')
  }

  // -------------------------------------------------
}
