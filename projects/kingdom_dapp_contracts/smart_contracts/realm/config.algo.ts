import { arc4 } from '@algorandfoundation/algorand-typescript'

export class KingdomIdType extends arc4.Struct<{
  appId: arc4.UintN64
}> {}

export class KingdomDataType extends arc4.Struct<{
  kingdomContribution: arc4.UintN64
}> {}
