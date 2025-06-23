import { assert, Contract, Global, GlobalState, gtxn, itxn, uint64 } from '@algorandfoundation/algorand-typescript'

export class KingdomTreasury extends Contract {
  // MANAGER_ADDRESS = GlobalState<arc4.Address>()
  DEV_TREASURY = GlobalState<uint64>()
  COMMUNITY_TREASURY = GlobalState<uint64>()
  TREASURY_ASSET_ID = GlobalState<uint64>()

  total_treasury = GlobalState<uint64>()
  total_withdrawn = GlobalState<uint64>()

  public setupKingdomTreasury(projectAppId: uint64, reserveTokenId: uint64): void {
    this.TREASURY_ASSET_ID.value = reserveTokenId
    this.total_treasury.value = 0
    this.total_withdrawn.value = 0

    itxn
      .assetTransfer({
        xferAsset: this.TREASURY_ASSET_ID.value,
        assetReceiver: Global.currentApplicationAddress,
        assetAmount: 0,
      })
      .submit()
    this.DEV_TREASURY.value = 80
    this.COMMUNITY_TREASURY.value = 20
  }

  public depositToTreasury(depositTxn: gtxn.PaymentTxn): void {
    const amount = depositTxn.amount
    assert(amount > 0, 'Deposit amount must be greater than 0')
    this.total_treasury.value += amount
  }
}
