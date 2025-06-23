import {
  arc4,
  assert,
  Asset,
  Contract,
  GlobalState,
  itxn,
  LocalState,
  uint64,
} from '@algorandfoundation/algorand-typescript'
import { Txn } from '@algorandfoundation/algorand-typescript/op'
import { CitizenType } from './config.algo'

export class Kingdom extends Contract {
  MAX_TOKEN_SUPPLY = GlobalState<uint64>()

  REALM_APP_ID = GlobalState<uint64>()
  kingdom_coin = GlobalState<Asset>()
  kingdom_name = GlobalState<arc4.Str>()
  king_address = GlobalState<arc4.Address>()
  kingdom_image_url = GlobalState<arc4.Str>()
  total_funded = GlobalState<uint64>()
  kingdom_description = GlobalState<arc4.Str>()
  kingdom_primary_color = GlobalState<arc4.Str>()
  kingdom_secondary_color = GlobalState<arc4.Str>()
  kingdom_background_color = GlobalState<arc4.Str>()
  kingdom_accent_color = GlobalState<arc4.Str>()
  kingdom_text_color = GlobalState<arc4.Str>()
  citizen = LocalState<CitizenType>()

  /**
   * @param appId The appId of the repo contract
   * @param appAddress The address of the repo contract
   * @param kingdomName The name of the kingdom
   * @param unitName The unit name of the token
   */
  public createKingdom(
    kingdomName: arc4.Str,
    kingdomDescription: arc4.Str,
    tokenName: arc4.Str,
    tokenSymbol: arc4.Str,
    kingdomImage: arc4.Str,
    kingdomPrmaryColor: arc4.Str,
    kingdomSecondaryColor: arc4.Str,
    kingdomBackgroundColor: arc4.Str,
    kingdomAccentColor: arc4.Str,
    kingdomTextColor: arc4.Str,
    repoId: uint64,
  ): void {
    this.MAX_TOKEN_SUPPLY.value = 1000000 * 10 ** 6
    this.kingdom_name.value = kingdomName
    this.kingdom_image_url.value = kingdomImage
    this.king_address.value = new arc4.Address(Txn.sender)
    this.REALM_APP_ID.value = repoId
    this.kingdom_description.value = kingdomDescription
    this.kingdom_primary_color.value = kingdomPrmaryColor
    this.kingdom_secondary_color.value = kingdomSecondaryColor
    this.kingdom_background_color.value = kingdomBackgroundColor
    this.kingdom_accent_color.value = kingdomAccentColor
    this.kingdom_text_color.value = kingdomTextColor

    this.total_funded.value = 0
    this.kingdom_coin.value = this.createKingdomToken(tokenSymbol)
  }

  /**
   * @param unitName The unit name of the token
   */
  private createKingdomToken(unitName: arc4.Str): Asset {
    const createdAsset = itxn
      .assetConfig({
        assetName: this.kingdom_name.value.native,
        decimals: 6,
        total: this.MAX_TOKEN_SUPPLY.value,
        unitName: unitName.native,
      })
      .submit().createdAsset

    this.kingdom_coin.value = createdAsset

    return createdAsset
  }

  /**
   * This method is used to claim the nomination tokens.
   * It checks if the sender is the king of the kingdom.
   */
  public claimNominationTokens() {
    this.isKing()
  }

  // Modifiers -------------------------------------------------

  /**
   * Checks if the sender is a peasant of the kingdom.
   * A peasant is someone who opted in to the kingdom coin
   */
  private isPeasant() {
    const sender = Txn.sender
    assert(sender.isOptedIn(this.kingdom_coin.value), 'Only citizens can perform this action')
  }

  /**
   * Checks if the sender is a citizen of the kingdom.
   * A citizen is someone who has opted in to the kingdom coin and has a local state entry
   */
  private isCitizen() {
    this.isPeasant()
    const sender = Txn.sender
    assert(this.citizen(sender).hasValue, 'Only citizens can perform this action')
  }

  /**
   * Checks if the sender is the king of the kingdom.
   * The king is the creator of the kingdom and has special privileges.
   */
  private isKing() {
    this.isPeasant()
    this.isCitizen()
    const sender = new arc4.Address(Txn.sender)
    assert(this.king_address.value === sender, 'Only the king can perform this action')
  }

  // -------------------------------------------------
}
