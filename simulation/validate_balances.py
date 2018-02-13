import csv
from web3 import Web3, HTTPProvider
from solc import compile_source
from sqlalchemy.orm import sessionmaker

from user_token import Account, engine

w3 = Web3(HTTPProvider('http://127.0.0.1:8545'))
session = sessionmaker(bind=engine)()

with open('../contracts/4tests.sol', 'r') as contracts_file:
    source_code = contracts_file.read()

compiled_source = compile_source(source_code)
token_interface = compiled_source['<stdin>:MFC_Token']
token_contract = w3.eth.contract(
    abi=token_interface['abi'],
    bytecode=token_interface['bin'])

with open('deploy_info.csv', 'rt') as text_file:
    spamreader = csv.reader(text_file, quoting=csv.QUOTE_MINIMAL)
    next(spamreader)
    next(spamreader)
    _, token_address = next(spamreader)

token_instance = token_contract(token_address)
accounts = session.query(Account)

for acc in accounts:
    real_balance = token_instance.call().balanceOf(acc.address)
    expected_balance = acc.balance
    if expected_balance != str(real_balance):
        print(acc.address)
        print("{} - {}".format(real_balance, expected_balance))

print("Finished")