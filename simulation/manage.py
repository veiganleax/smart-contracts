import csv
import argparse
import time
from datetime import datetime
import getpass
import math

from web3 import Web3, HTTPProvider
from solc import compile_files

from utils import CSV_ROWS, get_csv_file_row, wait_for_tx

w3 = Web3(HTTPProvider('http://127.0.0.1:8545'))


def get_token_instance(compiled_source):
    with open('deploy_info.csv', 'rt') as text_file:
        token_address = get_csv_file_row(text_file, CSV_ROWS['token'])[1]

    token_interface = compiled_source['../contracts/MFC_coin.sol:MFC_Token']
    token_contract = w3.eth.contract(
        abi=token_interface['abi'],
        bytecode=token_interface['bin'])
    token_instance = token_contract(token_address)
    return token_instance


def get_controller_instance(compiled_source):
    with open('deploy_info.csv', 'rt') as text_file:
        address = get_csv_file_row(text_file, CSV_ROWS['controller'])[1]

    ico_controller_interface = compiled_source['../contracts/ICO_controller.sol:ICO_controller']

    ico_controller_contract = w3.eth.contract(
        abi=ico_controller_interface['abi'],
        bytecode=ico_controller_interface['bin'])
    ico_controller_instance = ico_controller_contract(address)
    return ico_controller_instance


def get_ico_instance(address, compiled_source):
    ico_interface = compiled_source['../contracts/ICO_crowdsale.sol:WhitelistedCrowdsale']
    ico_contract = w3.eth.contract(
        abi=ico_interface['abi'],
        bytecode=ico_interface['bin'])
    ico_instance = ico_contract(address)
    return ico_instance


def add_addresses_to_whitelist(address, file_path, controller_instance):
    if file_path:
        with open(file_path, 'r') as csv_file:
            addresses = list((addr[0] for addr in csv.reader(csv_file)))
    else:
        addresses = [address]

    number_of_iterarions = math.ceil(len(addresses) / 125)
    for i in range(number_of_iterarions):
        tx_hash = controller_instance.transact(
            {'from': owner_account}
        ).addBuyers(addresses[i * 125:(i + 1) * 125])
        wait_for_tx(tx_hash, w3, wait_message="Wait for account to be added to whitelist {}".format(i))
    print("\n\n successfully added to whitelist")
    with open('whitelisted.csv', 'at') as text_file:
        spamwriter = csv.writer(text_file, quoting=csv.QUOTE_MINIMAL)
        spamwriter.writerows(([address] for address in addresses))


def print_address_balance(address, token_instance):
    addr_balance = token_instance.call().balanceOf(address)
    print("{} balance: {}".format(address, addr_balance))


def print_stage_info():
    with open('deploy_info.csv', 'rt') as text_file:
        spamreader = csv.reader(text_file, quoting=csv.QUOTE_MINIMAL)
        for i in range(CSV_ROWS['private_offer']):
            next(spamreader)
        ico_array = []
        for name, address in spamreader:
            ico_array.append((name, get_ico_instance(address, compiled_source)))

    if not ico_array:
        print("No stage was activated")

    print("\nUTC+0 is used\nCurrent date: {}\n".format(
        datetime.utcfromtimestamp(time.time()).strftime('%Y-%m-%d %H:%M:%S'))
    )
    for name, ico_instance in ico_array:
        print("Stage: {}\n  Address: {}\n  Has ended: {}\n  Start date: {}\n  End date: {}".format(
            name, ico_instance.address, ico_instance.call().hasEnded(),
            datetime.utcfromtimestamp(ico_instance.call().startTime()).strftime('%Y-%m-%d %H:%M:%S'),
            datetime.utcfromtimestamp(ico_instance.call().endTime()).strftime('%Y-%m-%d %H:%M:%S'),
        ))
        print("  Wei raised: {}\n".format(ico_instance.call().weiRaised()))


def finish_ico(controller_instance):
    tx_hash = controller_instance.transact(
        {'from': owner_account}
    ).finishCrowdsale()
    wait_for_tx(tx_hash, w3, wait_message="Wait for finish function")
    tx_hash = controller_instance.transact(
        {'from': owner_account}
    ).finishCrowdsaleBurnUnused()
    wait_for_tx(tx_hash, w3, wait_message="Wait for burn function")
    print("Balance of escrow ICO is: {}".format(
        w3.eth.getBalance(controller_instance.call().escrowIco())))
    print("Balance of holder ICO is: {}".format(
        w3.eth.getBalance(controller_instance.call().holder())))


def increase_ico_endtime(controller_instance, new_endtime):
    tx_hash = controller_instance.transact(
        {'from': owner_account}
    ).increaseCurrentIcoEndTime(new_endtime)
    wait_for_tx(tx_hash, w3, wait_message="Wait for ico to increase time")
    print("Ico offer endtime updated: {}".format(
        datetime.utcfromtimestamp(new_endtime).strftime('%Y-%m-%d %H:%M:%S')
    ))


def add_dev_reward(controller_instance, address, amount):
    tx_hash = controller_instance.transact(
        {'from': owner_account}
    ).addDevReward(address, amount)
    wait_for_tx(tx_hash, w3, wait_message="Wait for add dev reward")
    new_reward = controller_instance.call().devRewards(address)
    print('{address} reward is now {new_reward}')


def send_airdrop(controller_instance, drop_file_path):
    with open(drop_file_path, 'r') as csv_file:
        addresses, amounts = list(zip(*csv.reader(csv_file)))
        addresses, amounts = list(addresses), list(amounts)
        amounts = [int(am) for am in amounts]

    number_of_iterarions = math.ceil(len(addresses) / 125)
    for i in range(number_of_iterarions):
        tx_hash = controller_instance.transact(
            {'from': owner_account}
        ).sendAirdrop(addresses[i * 125:(i + 1) * 125], amounts[i * 125:(i + 1) * 125])
        wait_for_tx(tx_hash, w3, wait_message="Wait for airdrop send {}".format(i))


ap = argparse.ArgumentParser()

ap.add_argument('--address', '-a', type=str, help='optional address')
ap.add_argument('--endtime', '-d', type=int, help='Unix endtime for private offer.')
ap.add_argument('--amount', '-m', type=int, help='Amount of dev reward')
ap.add_argument('command', type=str, choices=[
    'balance', 'whitelist', 'stage_info', 'finish', 'increase_ico_endtime', 'add_dev_reward',
    'send_airdrop'],
                help='Command to do')
ap.add_argument('--wallet', '-w', type=str, help="Owner account", default=w3.eth.accounts[0])
ap.add_argument('--password', '-p', help='Ask input password to unlock account', action='store_true')
ap.add_argument('--file', '-f', type=str, help='optional path to file')

if __name__ == '__main__':
    args = vars(ap.parse_args())
    address = args['address']
    command = args['command']
    endtime = args['endtime']
    amount = args['amount']
    file_path = args['file']
    owner_account = args['wallet']
    request_password = args['password']
    owner_password = '1'

    if request_password:
        owner_password = getpass.getpass()

    try:
        w3.personal.unlockAccount(owner_account, owner_password)
    except ValueError:
        pass

    compiled_source = compile_files(["../contracts/ICO_controller.sol"], optimize=True)

    token_instance = get_token_instance(compiled_source)
    controller_instance = get_controller_instance(compiled_source)

    if command == 'balance':
        print_address_balance(address, token_instance)
    elif command == 'whitelist':
        add_addresses_to_whitelist(address, file_path, controller_instance)
    elif command == 'stage_info':
        print_stage_info()
    elif command == 'finish':
        finish_ico(controller_instance)
    elif command == 'increase_ico_endtime':
        increase_ico_endtime(controller_instance, endtime)
    elif command == 'add_dev_reward':
        add_dev_reward(controller_instance, address, amount)
    elif command == 'send_airdrop':
        send_airdrop(controller_instance, file_path)

    try:
        w3.personal.lockAccount(owner_account)
    except ValueError:
        pass
