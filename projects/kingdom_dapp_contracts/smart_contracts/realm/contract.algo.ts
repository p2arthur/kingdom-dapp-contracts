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
  Txn,
  uint64,
} from '@algorandfoundation/algorand-typescript'
import { Kingdom } from '../kingdom/contract.algo'
import { KingdomDataType, KingdomIdType } from './config.algo'

export class Realm extends Contract {
  MANAGER_ADDRESS = GlobalState<arc4.Address>()
  CONTRIBUTION_SETTLE = GlobalState<uint64>()
  CONTRIBUTION_DEPLOY = GlobalState<uint64>()
  CONTRIBUTION_ENGAGE = GlobalState<uint64>()
  total_kingdoms = GlobalState<uint64>()
  project_creation_fee = GlobalState<uint64>()
  funding_goal_1 = GlobalState<uint64>()
  min_purchase_amount = GlobalState<uint64>()

  kingdoms = BoxMap<KingdomIdType, KingdomDataType>({ keyPrefix: '_k' })

  public createApplication() {
    this.MANAGER_ADDRESS.value = new arc4.Address(Txn.sender)
    this.total_kingdoms.value = 0
    this.project_creation_fee.value = 1000000
    this.funding_goal_1.value = 100000000
    this.min_purchase_amount.value = 10000000
    this.CONTRIBUTION_SETTLE.value = 10
    this.CONTRIBUTION_DEPLOY.value = 5
    this.CONTRIBUTION_ENGAGE.value = 1
  }

  /**
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
    this.kingdoms(kingdomId).value = new KingdomDataType({
      kingdomContribution: new arc4.UintN64(0),
      kingdomManager: new arc4.Address(Txn.sender),
      kingdomAddress: new arc4.Address(appAddress),
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

    return new KingdomIdType({ appId: kingdomId.appId })
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

    this.addContribution(appId, 1)
  }

  /**
   * @param kingdomId The id of the project
   * @param contributionType The type of contribution (1: settle, 2: deploy, 3: engage)
   */
  // Contribution methods ---------------------------
  public addContribution(appId: uint64, contributionType: uint64): void {
    const kingdomId = new KingdomIdType({ appId: new arc4.UintN64(appId) })

    // Get the box reference
    const boxRef = this.kingdoms(kingdomId)

    // Work on a copy of the struct
    const selectedKingdom = boxRef.value.copy()

    // Update the contribution as needed
    if (contributionType === 1) {
      selectedKingdom.kingdomContribution = new arc4.UintN64(
        selectedKingdom.kingdomContribution.native + this.CONTRIBUTION_SETTLE.value,
      )
    }
    if (contributionType === 2) {
      this.isKingdomAddress(selectedKingdom)
      selectedKingdom.kingdomContribution = new arc4.UintN64(
        selectedKingdom.kingdomContribution.native + this.CONTRIBUTION_DEPLOY.value,
      )
    }
    if (contributionType === 3) {
      this.isKingdomAddress(selectedKingdom)
      selectedKingdom.kingdomContribution = new arc4.UintN64(
        selectedKingdom.kingdomContribution.native + this.CONTRIBUTION_ENGAGE.value,
      )
    }

    // Write the updated struct back to the box
    boxRef.value = selectedKingdom.copy()
  }
  // ------------------------------------------------

  // Modifiers --------------------------------
  private enoughProjectCreationFee(feeTransaction: gtxn.PaymentTxn): void {
    assert(feeTransaction.amount >= this.project_creation_fee.value, 'Not enough project creation fee')
  }

  private isKingdomAddress(selectedKingdom: KingdomDataType): void {
    const senderAppAddress = new arc4.Address(Txn.sender)
    assert(
      senderAppAddress === selectedKingdom.kingdomAddress,
      'Only the kingdom contract can add a contribution for deployment',
    )
  }

  // -------------------------------------------------

  // Getters -----------------------------------------
  public getKingdomBoxById(appId: uint64): KingdomDataType {
    const kingdomId = new KingdomIdType({ appId: new arc4.UintN64(appId) })
    const selectedKingdom: KingdomDataType = this.kingdoms(new KingdomIdType(kingdomId)).value.copy()

    return selectedKingdom
  }
  // -------------------------------------------------
}
