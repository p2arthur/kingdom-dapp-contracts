import { AlgorandClient, algos, microAlgos } from '@algorandfoundation/algokit-utils'
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing'
import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { RealmClient, RealmFactory } from '../artifacts/realm/RealmClient'

const fixture = algorandFixture()

describe('Realm contract', () => {
  beforeEach(fixture.newScope)
  let realmManagerAccount: any
  let realmClient: RealmClient
  let algorandClient: AlgorandClient
  beforeAll(async () => {
    await fixture.newScope()
    const algorand = AlgorandClient.fromEnvironment()
    algorandClient = algorand
    realmManagerAccount = await algorand.account.kmd.getOrCreateWalletAccount('manager-account', algos(100))
    algorand.setSignerFromAccount(realmManagerAccount)
    console.log('Realm Manager Account:', realmManagerAccount.addr.toString())
    await algorand.account.ensureFundedFromEnvironment(realmManagerAccount.addr, algos(100))
    const factory = algorand.client.getTypedAppFactory(RealmFactory, { defaultSender: realmManagerAccount.addr })
    const { appClient } = await factory.send.create.createApplication({
      args: [],
    })

    console.log('Realm Client App Address:', appClient.appId)
    realmClient = appClient

    await algorandClient.send.payment({
      sender: realmManagerAccount.addr,
      receiver: realmClient.appAddress,
      amount: algos(30),
    })
  }, 60000)

  test('should create a new kingdom into the realm and add 10 to the project contribution box', async () => {
    const transaction = await algorandClient.createTransaction.payment({
      sender: realmManagerAccount.addr,
      receiver: realmClient.appAddress,
      amount: algos(20),
    })

    const result = await realmClient.send.createKingdom({
      args: {
        projectName: 'MyProject',
        projectDescription: 'MyProjectDescription',
        tokenName: 'MYP',
        tokenSymbol: 'MYP',
        kingdomImage: 'https://example.com/image.png',
        kingdomPrmaryColor: '#FFFFFF',
        kingdomSecondaryColor: '#000000',
        kingdomBackgroundColor: '#FF0000',
        kingdomAccentColor: '#00FF00',
        kingdomTextColor: '#0000FF',
        feeTransaction: transaction,
      },
      sender: realmManagerAccount.addr,
      extraFee: microAlgos(100000),
    })

    const { appId } = result.return!
    console.log('Created Kingdom App ID:', appId)

    const kingdom = await realmClient.send.getKingdomBoxById({ args: { appId: appId! } })

    console.log('kingdom', kingdom.return?.kingdomContribution)

    expect(kingdom.return?.kingdomContribution).toBe(10n)
  })
})
