// components/products/ProductActions.jsx - VERSIÓN ACTUALIZADA CON BOTÓN CORRECTO
import React, { useState } from 'react';
import { PackageOpen, MinusCircle, ShoppingCart } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useHousehold } from '../../context/HouseholdContext';
import { shoppingService } from '../../api/shopping.service';

const ProductActions = ({ product, onConsume, onOpen }) => {
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [consumeAmount, setConsumeAmount] = useState('');
  const [purchaseQuantity, setPurchaseQuantity] = useState(product.quantityTotal || 1);
  const [loading, setLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const { householdId } = useHousehold();

  const handleConsume = async () => {
    if (!consumeAmount || isNaN(consumeAmount) || parseFloat(consumeAmount) <= 0) {
      return;
    }

    setLoading(true);
    await onConsume(product.id, parseFloat(consumeAmount));
    setLoading(false);
    setShowConsumeModal(false);
    setConsumeAmount('');
  };

  const handlePurchase = async () => {
    if (!householdId) {
      console.error('❌ No hay householdId para agregar a lista de compras');
      return;
    }

    setPurchaseLoading(true);
    try {
      const result = await shoppingService.addManualItem(
        householdId, 
        product.name, 
        product.categoryId || 'otros',
        purchaseQuantity,
        product.unit || 'units'
      );
      
      if (result.success) {
        console.log('✅ Producto agregado a lista de compras');
        setShowPurchaseModal(false);
        setPurchaseQuantity(product.quantityTotal || 1);
      } else {
        console.error('❌ Error agregando a lista:', result.error);
      }
    } catch (error) {
      console.error('❌ Error inesperado:', error);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const quickConsumeOptions = [1, 5, 10, 25];

  return (
    <>
      <div className="flex space-x-2">
        {product.lastOpenedAt ? (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setShowConsumeModal(true)}
          >
            <MinusCircle className="h-4 w-4 mr-2" />
            Consumir
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={() => onOpen(product.id)}
          >
            <PackageOpen className="h-4 w-4 mr-2" />
            Abrir
          </Button>
        )}

        {product.status === 'out' && (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => setShowPurchaseModal(true)}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Comprar
          </Button>
        )}
      </div>

      {/* Modal para consumir */}
      <Modal
        isOpen={showConsumeModal}
        onClose={() => {
          setShowConsumeModal(false);
          setConsumeAmount('');
        }}
        title="Consumir producto"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad a consumir ({product.unit})
            </label>
            <input
              type="number"
              min="0"
              max={product.quantityCurrent}
              step="0.001"
              value={consumeAmount}
              onChange={(e) => setConsumeAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder={`Máximo: ${product.quantityCurrent}`}
            />
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">Consumo rápido:</p>
            <div className="grid grid-cols-2 gap-2">
              {quickConsumeOptions.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setConsumeAmount(amount.toString())}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {amount} {product.unit}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button" // <-- AGREGAR EXPLÍCITAMENTE
              variant="outline"
              onClick={() => {
                setShowConsumeModal(false);
                setConsumeAmount('');
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button" // <-- AGREGAR EXPLÍCITAMENTE
              variant="primary"
              onClick={handleConsume}
              disabled={!consumeAmount || loading || parseFloat(consumeAmount) > product.quantityCurrent}
              loading={loading}
            >
              Confirmar consumo
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal para comprar */}
      <Modal
        isOpen={showPurchaseModal}
        onClose={() => {
          setShowPurchaseModal(false);
          setPurchaseQuantity(product.quantityTotal || 1);
        }}
        title={`Agregar "${product.name}" a lista de compras`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad a comprar ({product.unit})
            </label>
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={purchaseQuantity}
              onChange={(e) => setPurchaseQuantity(parseFloat(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPurchaseModal(false);
                setPurchaseQuantity(product.quantityTotal || 1);
              }}
              disabled={purchaseLoading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handlePurchase}
              loading={purchaseLoading}
              disabled={purchaseLoading}
            >
              Agregar a lista
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ProductActions;