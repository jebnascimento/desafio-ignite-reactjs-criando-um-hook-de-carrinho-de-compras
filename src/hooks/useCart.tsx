import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const isAlreadyProductInTheCart = (
    updatedCart: Product[],
    productId: number
  ): boolean => {
    if (!cart.length) {
      return false;
    }

    if (updatedCart.find((product) => product.id === productId) === undefined) {
      return false;
    }
    return true;
  };

  // const getProductAmountInCart = (
  //   cart: Product[],
  //   productId: number
  // ): number => {
  //   if (!cart.length) {
  //     return 0;
  //   }
  //   return cart
  //     .filter((product) => product.id === productId)
  //     .reduce((_, product) => {
  //       return product.amount;
  //     }, 0);
  // };

  const saveCartToLocalStorage = (cart: Product[]) => {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  };

  const addProduct = async (productId: number) => {
    try {
      const _cart = [...cart];
      const product = await api.get(`/products/${productId}`);
      const stock = await api.get(`/stock/${productId}`);

      if (isAlreadyProductInTheCart(_cart, productId)) {
        const chosenProduct = _cart.find(
          (product) => product.id === productId
        ) as Product;

        const chosenProductAmount = chosenProduct.amount;

        if (chosenProductAmount + 1 > stock.data.amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }
        chosenProduct.amount = chosenProductAmount + 1;
        setCart(_cart);
        saveCartToLocalStorage(_cart);
      } else {
        const newProduct = { ...product.data, amount: 1 };
        _cart.push(newProduct);
        setCart(_cart);
        saveCartToLocalStorage(_cart);
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (_productId: number) => {
    const currentCart = [...cart];
    try {
      const productIndexToBeRemoved = currentCart.findIndex(
        (product) => product.id === _productId
      );

      if (productIndexToBeRemoved >= 0) {
        currentCart.splice(productIndexToBeRemoved, 1);
        setCart(currentCart);
        saveCartToLocalStorage(currentCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);

      if (amount > stock.data.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      const updatedCart = [...cart];

      // const updatedCart = currentCart.map((product) => {
      //   if (product.id === productId) {
      //     product.amount = amount;
      //     return product;
      //   } else {
      //     throw Error();
      //   }
      // });

      const isProductExist = updatedCart.find(
        (product) => product.id === productId
      );

      if (isProductExist) {
        isProductExist.amount = amount;
        console.log(updatedCart);
        setCart(updatedCart);
        saveCartToLocalStorage(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
