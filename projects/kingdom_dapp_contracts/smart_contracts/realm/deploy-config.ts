import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { TransactionSignerAccount } from '@algorandfoundation/algokit-utils/types/account'
import { WeRepoFactory } from '../artifacts/we_repo/WeRepoClient'

// Below is a showcase of various deployment options you can use in TypeScript Client
export async function deploy(deployer: TransactionSignerAccount) {
  console.log('=== Deploying WeRepo ===')

  const algorand = AlgorandClient.fromEnvironment()

  const factory = algorand.client.getTypedAppFactory(WeRepoFactory, {
    defaultSender: deployer.addr,
  })

  const { appClient, result } = await factory.deploy({ onUpdate: 'append', onSchemaBreak: 'append' })

  // If app was just created fund the app account
  if (['create', 'replace'].includes(result.operationPerformed)) {
    await algorand.send.payment({
      amount: (1).algo(),
      sender: deployer.addr,
      receiver: appClient.appAddress,
    })
  }

  return { client: appClient, algorand }
}
