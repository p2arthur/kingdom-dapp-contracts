import { arc4, assert, Contract, Global, GlobalState, Txn, uint64 } from '@algorandfoundation/algorand-typescript'

export class RealmTreasury extends Contract {
  MANAGER_ADDRESS = GlobalState<arc4.Address>()
  DEV_TREASURY = GlobalState<uint64>()
  COMMUNITY_TREASURY = GlobalState<uint64>()

  public setupWeDevTreasury(projectAppId: uint64, reserveTokenId: uint64): void {
    assert(this.MANAGER_ADDRESS.value.native !== Global.zeroAddress, 'WeDevTreasury already setup')
    this.MANAGER_ADDRESS.value = new arc4.Address(Txn.sender)
    this.DEV_TREASURY.value = 80
    this.COMMUNITY_TREASURY.value = 20
  }

  public depositToTreasury(): void {}
}
