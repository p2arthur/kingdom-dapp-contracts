import { arc4 } from '@algorandfoundation/algorand-typescript'

export class CitizenType extends arc4.Struct<{
  citizen_contribution: arc4.UintN64
}> {}
