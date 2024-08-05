import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract PaymentERC20 is ERC20 {
    constructor() ERC20("PaymentERC20", "Test") {}

    function mint(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}