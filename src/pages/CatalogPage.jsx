import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AppButton from '../components/ui/AppButton'
import AppImage from '../components/ui/AppImage'

export default function CatalogPage({
  apiUrl,
  token,
  user,
  cartItems,
  onAddToCart,
  onNotify,
  onPreviewImage,
  normalizeCode,
  normalizeReviewScope,
  summarizeReviews,
  getCatalogGroup,
  getProductImageUrl,
  getProductDescription,
  uploadProductImageFile,
  mapProductToAdminForm,
  currency,
  ReviewStarsComponent,
  RatingPickerComponent,
  ReviewThreadListComponent,
  reviewScopeProduct,
  initialAdminProductForm,
  categoryActionAdd,
  categoryActionEdit,
  categoryActionDelete,
  categoryFilterAllOption,
  productImageFallbacks,
  productUnitOptions,
}) {
  // Aliases para usar props extensas con nombres locales mas claros.
  const ReviewStars = ReviewStarsComponent
  const RatingPicker = RatingPickerComponent
  const ReviewThreadList = ReviewThreadListComponent
  const REVIEW_SCOPE_PRODUCT = reviewScopeProduct
  const INITIAL_ADMIN_PRODUCT_FORM = initialAdminProductForm
  const CATEGORY_ACTION_ADD = categoryActionAdd
  const CATEGORY_ACTION_EDIT = categoryActionEdit
  const CATEGORY_ACTION_DELETE = categoryActionDelete
  const CATEGORY_FILTER_ALL_OPTION = categoryFilterAllOption
  const PRODUCT_IMAGE_FALLBACKS = productImageFallbacks
  const PRODUCT_UNIT_OPTIONS = productUnitOptions

  // Estado principal de catalogo, reseñas y panel de administracion.
  const location = useLocation()
  const [products, setProducts] = useState([])
  const [reviews, setReviews] = useState([])
  const [reviewDrafts, setReviewDrafts] = useState({})
  const [reviewSavingKey, setReviewSavingKey] = useState('')
  const [reviewReplyDrafts, setReviewReplyDrafts] = useState({})
  const [reviewReplySavingKey, setReviewReplySavingKey] = useState('')
  const [conversationDrafts, setConversationDrafts] = useState({})
  const [conversationSavingKey, setConversationSavingKey] = useState('')
  const [conversationDeletingKey, setConversationDeletingKey] = useState('')
  const [reviewDeleteSavingKey, setReviewDeleteSavingKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [adminMeta, setAdminMeta] = useState({ categorias: [], proveedores: [] })
  const [adminForm, setAdminForm] = useState(INITIAL_ADMIN_PRODUCT_FORM)
  const [editingProductId, setEditingProductId] = useState(null)
  const [adminSaving, setAdminSaving] = useState(false)
  const [adminDeletingId, setAdminDeletingId] = useState(null)
  const [adminMessage, setAdminMessage] = useState('')
  const [catalogFilter, setCatalogFilter] = useState('TODOS')
  const [adminCategoryFilter, setAdminCategoryFilter] = useState('TODAS')
  const [categoryAction, setCategoryAction] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryTargetId, setCategoryTargetId] = useState('')
  const [categoryEditName, setCategoryEditName] = useState('')
  const [categorySaving, setCategorySaving] = useState(false)
  const adminFormRef = useRef(null)
  const adminImageFileInputRef = useRef(null)
  const [adminImageUploading, setAdminImageUploading] = useState(false)

  // Determina permisos y lee codigo destacado desde la URL (query param destacado).
  const isAdmin = String(user?.rol || '').trim().toLowerCase() === 'administrador'
  const featuredCode = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('destacado') || ''
  }, [location.search])

  const featuredCodeNormalized = useMemo(
    () => normalizeCode(featuredCode),
    [featuredCode, normalizeCode],
  )

  // Base visible del catalogo: para admin se muestran solo productos vendibles.
  const visibleCatalogBase = useMemo(() => {
    // Admin can edit from the panel, but public catalog cards should show sellable items.
    if (!isAdmin) return products
    return products.filter(
      (product) =>
        String(product.estado || '').toUpperCase() === 'ACTIVO' &&
        Number(product.stock) > 0,
    )
  }, [products, isAdmin])

  // Valida si el producto destacado existe dentro del filtro visible actual.
  const hasFeaturedMatchVisible = useMemo(
    () =>
      featuredCodeNormalized
        ? visibleCatalogBase.some(
            (product) => normalizeCode(product.codigo) === featuredCodeNormalized,
          )
        : false,
    [visibleCatalogBase, featuredCodeNormalized, normalizeCode],
  )

  // Cantidad de productos por pestaña para mostrar contadores en el menu.
  const filterCounts = useMemo(() => {
    const counts = {
      TODOS: visibleCatalogBase.length,
      ARTESANAL: 0,
      LIMITADA: 0,
      ACCESORIOS: 0,
    }

    for (const product of visibleCatalogBase) {
      counts[getCatalogGroup(product)] += 1
    }

    return counts
  }, [visibleCatalogBase, getCatalogGroup])

  // Aplica filtro principal del menu (todos, artesanal, limitada, accesorios).
  const visibleProducts = useMemo(() => {
    if (catalogFilter === 'TODOS') return visibleCatalogBase
    return visibleCatalogBase.filter(
      (product) => getCatalogGroup(product) === catalogFilter,
    )
  }, [visibleCatalogBase, catalogFilter, getCatalogGroup])

  // Normaliza valores de filtros admin para evitar IDs inexistentes.
  const adminCategoryFilterValue = useMemo(() => {
    if (adminCategoryFilter === 'TODAS') return 'TODAS'
    const exists = adminMeta.categorias.some(
      (categoria) => String(categoria.id_categoria) === String(adminCategoryFilter),
    )
    return exists ? adminCategoryFilter : 'TODAS'
  }, [adminMeta.categorias, adminCategoryFilter])

  // Categoria objetivo usada en editar/eliminar categoria desde el panel admin.
  const categoryTargetIdValue = useMemo(() => {
    const exists = adminMeta.categorias.some(
      (categoria) => String(categoria.id_categoria) === String(categoryTargetId),
    )
    return exists ? categoryTargetId : ''
  }, [adminMeta.categorias, categoryTargetId])

  // Si admin eligio una categoria puntual, limita el grid a esa categoria.
  const visibleProductsByAdminCategory = useMemo(() => {
    if (!isAdmin || adminCategoryFilterValue === 'TODAS') return visibleProducts

    return visibleProducts.filter(
      (product) => String(product.id_categoria) === String(adminCategoryFilterValue),
    )
  }, [isAdmin, visibleProducts, adminCategoryFilterValue])

  // Mapa rapido para saber cuantas unidades de cada producto ya estan en carrito.
  const cartQuantityByProductId = useMemo(() => {
    const map = new Map()
    for (const item of cartItems) {
      map.set(item.id_producto, Number(item.cantidad) || 0)
    }
    return map
  }, [cartItems])

  // Agrupa reseñas por producto para renderizar hilos y resumenes por tarjeta.
  const productReviewsById = useMemo(() => {
    const map = new Map()

    for (const review of reviews) {
      if (normalizeReviewScope(review.scope) !== REVIEW_SCOPE_PRODUCT) continue

      const idProducto = Number(review.id_producto)
      if (!idProducto) continue

      if (!map.has(idProducto)) {
        map.set(idProducto, [])
      }

      map.get(idProducto).push(review)
    }

    return map
  }, [reviews, normalizeReviewScope, REVIEW_SCOPE_PRODUCT])

  // Calcula promedio/cantidad de reseñas por producto para mostrar reputacion.
  const reviewSummaryByProductId = useMemo(() => {
    const map = new Map()

    for (const product of products) {
      const itemReviews = productReviewsById.get(Number(product.id_producto)) || []
      map.set(Number(product.id_producto), summarizeReviews(itemReviews))
    }

    return map
  }, [products, productReviewsById, summarizeReviews])

  // Carga catalogo completo de productos.
  const loadProducts = useCallback(async () => {
    const response = await fetch(`${apiUrl}/products`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'No se pudo cargar el catálogo')
    }
    setProducts(data.products)
  }, [apiUrl, token])

  // Carga metadata necesaria para formularios admin (categorias/proveedores).
  const loadAdminMeta = useCallback(async () => {
    if (!isAdmin) return

    const metaResponse = await fetch(`${apiUrl}/products/meta`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const metaData = await metaResponse.json()
    if (!metaResponse.ok) {
      throw new Error(metaData.message || 'No se pudo cargar categorías y proveedores')
    }

    setAdminMeta({
      categorias: metaData.categorias || [],
      proveedores: metaData.proveedores || [],
    })
  }, [apiUrl, isAdmin, token])

  // Carga reseñas de productos y descarta otros scopes.
  const loadReviews = useCallback(async () => {
    const response = await fetch(`${apiUrl}/reviews`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'No se pudieron cargar las reseñas')
    }

    const productReviews = Array.isArray(data.reviews)
      ? data.reviews.filter(
          (review) => normalizeReviewScope(review.scope) === REVIEW_SCOPE_PRODUCT,
        )
      : []

    setReviews(productReviews)
  }, [apiUrl, token, normalizeReviewScope, REVIEW_SCOPE_PRODUCT])

  // Carga inicial del modulo: productos + reseñas y metadata admin si aplica.
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)

        await loadProducts()
        await loadReviews()

        if (isAdmin) {
          await loadAdminMeta()
        }
      } catch (requestError) {
        setError(requestError.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [token, isAdmin, loadProducts, loadAdminMeta, loadReviews])

  // Actualiza campos del formulario admin para crear/editar productos.
  const onAdminChange = (event) => {
    const { name, value } = event.target

    setAdminForm((prev) => ({ ...prev, [name]: value }))
  }

  // Abre/cierra acciones de categoria y precarga una categoria por defecto.
  const openCategoryAction = (action) => {
    setCategoryAction((prev) => (prev === action ? '' : action))

    if (
      (action === CATEGORY_ACTION_EDIT || action === CATEGORY_ACTION_DELETE) &&
      !categoryTargetIdValue &&
      adminMeta.categorias.length > 0
    ) {
      const firstCategory = adminMeta.categorias[0]
      setCategoryTargetId(String(firstCategory.id_categoria))
      setCategoryEditName(firstCategory.nombre)
    }
  }

  // URL para previsualizar imagen del formulario admin.
  const previewImageUrl = adminForm.imagen_url.trim() || PRODUCT_IMAGE_FALLBACKS[0]

  const openAdminImagePicker = () => {
    adminImageFileInputRef.current?.click()
  }

  const clearProductImage = () => {
    setAdminForm((prev) => ({ ...prev, imagen_url: '' }))
    window.requestAnimationFrame(() => {
      adminImageFileInputRef.current?.focus()
    })
  }

  // Sube la imagen al backend y guarda la URL en el formulario.
  const onAdminImageFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setAdminImageUploading(true)
    try {
      const imageUrl = await uploadProductImageFile(token, file)
      setAdminForm((prev) => ({ ...prev, imagen_url: imageUrl }))
      setAdminMessage('Imagen cargada correctamente.')
      onNotify('Imagen cargada correctamente.')
    } catch (requestError) {
      setAdminMessage(requestError.message)
      onNotify(requestError.message)
    } finally {
      setAdminImageUploading(false)
      event.target.value = ''
    }
  }

  // Restablece el formulario y sale del modo edicion.
  const resetAdminForm = () => {
    setAdminForm(INITIAL_ADMIN_PRODUCT_FORM)
    setEditingProductId(null)
  }

  // Carga producto en el formulario para editarlo y desplaza la vista al panel.
  const startEditing = (product) => {
    setAdminForm(mapProductToAdminForm(product))
    setEditingProductId(product.id_producto)
    setAdminMessage('')

    window.requestAnimationFrame(() => {
      if (adminFormRef.current) {
        adminFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }

  // Crea o actualiza producto segun si existe editingProductId.
  const onAdminSubmit = async (event) => {
    event.preventDefault()
    setAdminMessage('')
    setAdminSaving(true)

    const endpoint = editingProductId
      ? `${apiUrl}/products/${editingProductId}`
      : `${apiUrl}/products`
    const method = editingProductId ? 'PUT' : 'POST'

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(adminForm),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo guardar el producto')
      }

      setAdminMessage(data.message || 'Producto guardado correctamente')
      onNotify(data.message || 'Producto guardado correctamente.')
      resetAdminForm()
      await loadProducts()
    } catch (requestError) {
      setAdminMessage(requestError.message)
      onNotify(requestError.message)
    } finally {
      setAdminSaving(false)
    }
  }

  // Elimina un producto del catalogo desde el panel admin.
  const deleteProduct = async (product) => {
    const confirmed = window.confirm(
      `Eliminar producto ${product.nombre} (${product.codigo})? Esta acción no se puede deshacer.`,
    )
    if (!confirmed) return

    setAdminMessage('')
    setAdminDeletingId(product.id_producto)

    try {
      const response = await fetch(`${apiUrl}/products/${product.id_producto}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo eliminar el producto')
      }

      if (editingProductId === product.id_producto) {
        resetAdminForm()
      }

      setAdminMessage(data.message || 'Producto eliminado correctamente')
      onNotify(data.message || 'Producto eliminado correctamente.')
      await loadProducts()
    } catch (requestError) {
      setAdminMessage(requestError.message)
      onNotify(requestError.message)
    } finally {
      setAdminDeletingId(null)
    }
  }

  // CRUD de categorias para mantener el catalogo organizado por admin.
  const createCategory = async () => {
    const nombre = newCategoryName.trim()
    if (!nombre) {
      onNotify('Ingresa un nombre para la nueva categoría.')
      return
    }

    setCategorySaving(true)
    try {
      const response = await fetch(`${apiUrl}/products/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nombre }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo crear la categoría')
      }

      onNotify(data.message || 'Categoría creada correctamente.')
      setNewCategoryName('')
      await loadAdminMeta()
    } catch (requestError) {
      onNotify(requestError.message)
    } finally {
      setCategorySaving(false)
    }
  }

  const removeCategory = async () => {
    if (!categoryTargetIdValue) {
      onNotify('Selecciona una categoría para eliminar.')
      return
    }

    const selected = adminMeta.categorias.find(
      (categoria) => String(categoria.id_categoria) === String(categoryTargetIdValue),
    )

    const confirmed = window.confirm(
      `Eliminar categoría ${selected?.nombre || ''}? Esta acción no se puede deshacer.`,
    )
    if (!confirmed) return

    setCategorySaving(true)
    try {
      const response = await fetch(
        `${apiUrl}/products/categories/${categoryTargetIdValue}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo eliminar la categoría')
      }

      onNotify(data.message || 'Categoría eliminada correctamente.')
      setCategoryTargetId('')
      setCategoryEditName('')
      await loadAdminMeta()
    } catch (requestError) {
      onNotify(requestError.message)
    } finally {
      setCategorySaving(false)
    }
  }

  const updateCategory = async () => {
    const nombre = categoryEditName.trim()
    if (!categoryTargetIdValue) {
      onNotify('Selecciona una categoría para editar.')
      return
    }

    if (!nombre) {
      onNotify('Ingresa el nuevo nombre de la categoría.')
      return
    }

    setCategorySaving(true)
    try {
      const response = await fetch(
        `${apiUrl}/products/categories/${categoryTargetIdValue}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ nombre }),
        },
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo actualizar la categoría')
      }

      onNotify(data.message || 'Categoría actualizada correctamente.')
      await loadAdminMeta()
    } catch (requestError) {
      onNotify(requestError.message)
    } finally {
      setCategorySaving(false)
    }
  }

  // Sincroniza combo de categoria objetivo con el nombre editable.
  const onCategoryTargetChange = (value) => {
    setCategoryTargetId(value)
    const selected = adminMeta.categorias.find(
      (categoria) => String(categoria.id_categoria) === String(value),
    )
    setCategoryEditName(selected?.nombre || '')
  }

  // Valor consolidado del select principal de gestion de categorias.
  const categoryControlValue = categoryAction
    ? categoryAction
    : adminCategoryFilterValue === 'TODAS'
      ? CATEGORY_FILTER_ALL_OPTION
      : `FILTER_${adminCategoryFilterValue}`

  // Despacha entre accion CRUD de categoria o filtro por categoria.
  const onCategoryControlChange = (value) => {
    if (
      value === CATEGORY_ACTION_ADD ||
      value === CATEGORY_ACTION_EDIT ||
      value === CATEGORY_ACTION_DELETE
    ) {
      openCategoryAction(value)
      return
    }

    setCategoryAction('')

    if (value === CATEGORY_FILTER_ALL_OPTION) {
      setAdminCategoryFilter('TODAS')
      return
    }

    if (value.startsWith('FILTER_')) {
      setAdminCategoryFilter(value.replace('FILTER_', ''))
    }
  }

  // Agrega al carrito respetando stock disponible y muestra feedback al usuario.
  const handleAddToCart = (product) => {
    const stockActual = Number(product.stock) || 0
    const cantidadEnCarrito = cartQuantityByProductId.get(product.id_producto) || 0
    const restante = Math.max(stockActual - cantidadEnCarrito, 0)

    if (restante <= 0) {
      onNotify(`Ya no hay stock disponible para ${product.nombre}.`)
      return
    }

    onAddToCart(product)
    const nuevoRestante = Math.max(restante - 1, 0)
    onNotify(`${product.nombre} se registro en el carrito. Quedan ${nuevoRestante}.`)
  }

  // Mantiene borradores de reseña por producto para no perder cambios del usuario.
  const updateProductReviewDraft = (productId, field, value) => {
    setReviewDrafts((prev) => ({
      ...prev,
      [productId]: {
        rating: '5',
        comment: '',
        ...(prev[productId] || {}),
        [field]: value,
      },
    }))
  }

  // Publica una reseña (scope producto) y recarga listado para reflejar cambios.
  const submitReview = async ({ scope, idProducto = null, draft, key }) => {
    const rating = Number(draft?.rating)

    if (!rating || rating < 1 || rating > 5) {
      onNotify('Selecciona una calificación entre 1 y 5.')
      return
    }

    setReviewSavingKey(key)

    try {
      const response = await fetch(`${apiUrl}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scope,
          id_producto: idProducto,
          rating,
          comment: '',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo guardar la reseña')
      }

      onNotify(data.message || 'Reseña guardada correctamente.')
      if (scope === REVIEW_SCOPE_PRODUCT && idProducto) {
        setReviewDrafts((prev) => ({
          ...prev,
          [idProducto]: { rating: '5', comment: '' },
        }))
      }

      await loadReviews()
    } catch (requestError) {
      onNotify(requestError.message)
    } finally {
      setReviewSavingKey('')
    }
  }

  // Gestiona respuesta admin a una reseña puntual.
  const submitReviewReply = async (idReview, reply) => {
    const replyText = String(reply || '').trim()

    if (!replyText) {
      onNotify('Escribe una respuesta.')
      return
    }

    const replyKey = `reply-${idReview}`
    setReviewReplySavingKey(replyKey)

    try {
      const response = await fetch(`${apiUrl}/reviews/${idReview}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reply: replyText }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo guardar la respuesta')
      }

      onNotify(data.message || 'Respuesta guardada correctamente.')
      setReviewReplyDrafts((prev) => ({ ...prev, [idReview]: replyText }))
      await loadReviews()
    } catch (requestError) {
      onNotify(requestError.message)
    } finally {
      setReviewReplySavingKey('')
    }
  }

  // Permite respuestas en hilo de conversacion de una reseña.
  const submitConversationReply = async (idReview, comment) => {
    const commentText = String(comment || '').trim()

    if (!commentText) {
      onNotify('Escribe una respuesta para comentar esta reseña.')
      return
    }

    const key = `conversation-${idReview}`
    setConversationSavingKey(key)

    try {
      const response = await fetch(`${apiUrl}/reviews/${idReview}/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment: commentText }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo enviar la respuesta')
      }

      onNotify(data.message || 'Respuesta enviada correctamente.')
      setConversationDrafts((prev) => ({ ...prev, [idReview]: '' }))
      await loadReviews()
    } catch (requestError) {
      onNotify(requestError.message)
    } finally {
      setConversationSavingKey('')
    }
  }

  // Elimina una respuesta especifica dentro de una conversacion de reseñas.
  const deleteConversationReply = async (idReview, idReply) => {
    if (!idReview || !idReply) return

    const confirmed = window.confirm('¿Eliminar esta respuesta de la conversacion?')
    if (!confirmed) return

    const key = `conversation-delete-${idReview}-${idReply}`
    setConversationDeletingKey(key)

    try {
      const response = await fetch(
        `${apiUrl}/reviews/${idReview}/conversation/${idReply}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo eliminar la respuesta')
      }

      onNotify(data.message || 'Respuesta eliminada correctamente.')
      await loadReviews()
    } catch (requestError) {
      onNotify(requestError.message)
    } finally {
      setConversationDeletingKey('')
    }
  }

  // Elimina una reseña completa y actualiza la vista.
  const deleteReview = async (idReview) => {
    const confirmed = window.confirm('¿Eliminar esta reseña de forma permanente?')
    if (!confirmed) return

    const deleteKey = `reply-${idReview}`
    setReviewDeleteSavingKey(deleteKey)

    try {
      const response = await fetch(`${apiUrl}/reviews/${idReview}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo eliminar la reseña')
      }

      const successMessage = data.message || 'Reseña eliminada correctamente.'
      onNotify(successMessage)
      window.alert(successMessage)
      await loadReviews()
    } catch (requestError) {
      onNotify(requestError.message)
    } finally {
      setReviewDeleteSavingKey('')
    }
  }

  // Estados de pantalla para carga, error o catalogo vacio.
  if (loading) {
    return <p className="status-text">Cargando catálogo...</p>
  }

  if (error) {
    return <p className="error-text">{error}</p>
  }

  if (products.length === 0) {
    return (
      <section>
        <p className="status-text">
          No hay productos disponibles. Carga productos en la base de datos para
          empezar.
        </p>
        {featuredCode ? (
          <p className="status-text featured-banner-warning">
            El café destacado <strong>{featuredCode}</strong> no está disponible por
            ahora. Prueba con otro producto cuando el catálogo tenga stock.
          </p>
        ) : null}
      </section>
    )
  }

  // Render principal del catalogo: filtros, panel admin y tarjetas de producto.
  return (
    <section>
      <h2>Catálogo de café artesanal</h2>
      {featuredCode ? (
        <p className="status-text featured-banner">
          Edición limitada seleccionada: <strong>{featuredCode}</strong>. Agrégala al
          carrito para continuar con tu pedido.
        </p>
      ) : null}
      {featuredCode && !hasFeaturedMatchVisible ? (
        <p className="status-text featured-banner-warning">
          No encontramos ese código exacto en catálogo. Te mostramos los cafés
          disponibles para que elijas y compres.
        </p>
      ) : null}
      <div className="catalog-menu" role="tablist" aria-label="Filtros de catálogo">
        <AppButton
          className={`catalog-menu-btn ${catalogFilter === 'TODOS' ? 'active' : ''}`}
          type="button"
          onClick={() => setCatalogFilter('TODOS')}
          unstyled
        >
          Todos ({filterCounts.TODOS})
        </AppButton>
        <AppButton
          className={`catalog-menu-btn ${catalogFilter === 'ARTESANAL' ? 'active' : ''}`}
          type="button"
          onClick={() => setCatalogFilter('ARTESANAL')}
          unstyled
        >
          Cafés artesanales ({filterCounts.ARTESANAL})
        </AppButton>
        <AppButton
          className={`catalog-menu-btn ${catalogFilter === 'LIMITADA' ? 'active' : ''}`}
          type="button"
          onClick={() => setCatalogFilter('LIMITADA')}
          unstyled
        >
          <span className="menu-btn-media" aria-hidden="true">
            <AppImage src="/imagenes/Especial_1.jpeg" alt="" className="menu-btn-thumb" />
          </span>
          <span>Ediciones limitadas ({filterCounts.LIMITADA})</span>
        </AppButton>
        <AppButton
          className={`catalog-menu-btn ${catalogFilter === 'ACCESORIOS' ? 'active' : ''}`}
          type="button"
          onClick={() => setCatalogFilter('ACCESORIOS')}
          unstyled
        >
          <span className="menu-btn-media" aria-hidden="true">
            <AppImage src="/imagenes/Compresa.jpg" alt="" className="menu-btn-thumb" />
            <AppImage src="/imagenes/Cafetera_Prensa.jpg" alt="" className="menu-btn-thumb" />
          </span>
          <span>Accesorios ({filterCounts.ACCESORIOS})</span>
        </AppButton>
      </div>

      {isAdmin ? (
        <>
          <section className="card admin-panel">
            <h3>{editingProductId ? 'Editar producto' : 'Agregar nuevo producto'}</h3>
            {!editingProductId ? (
              <p className="status-text admin-status">
                Si ingresas un código existente, el sistema suma el stock al
                inventario sin crear duplicados.
              </p>
            ) : null}
            <div className="admin-category-toolbar admin-category-management">
              <label htmlFor="category-control-menu">Administrar categorías</label>
              <select
                id="category-control-menu"
                value={categoryControlValue}
                onChange={(event) => onCategoryControlChange(event.target.value)}
              >
                <option value={CATEGORY_FILTER_ALL_OPTION}>Todas las categorías</option>
                {adminMeta.categorias.map((categoria) => (
                  <option key={categoria.id_categoria} value={`FILTER_${categoria.id_categoria}`}>
                    Ver: {categoria.nombre}
                  </option>
                ))}
                <option value="" disabled>
                  ▼ Selecciona una acción
                </option>
                <option value={CATEGORY_ACTION_ADD}>Agregar categoría</option>
                <option value={CATEGORY_ACTION_EDIT}>Editar categoría</option>
                <option value={CATEGORY_ACTION_DELETE}>Eliminar categoría</option>
              </select>
            </div>
              {categoryAction ? (
                <div className="span-all category-inline-panel">
                  {categoryAction === CATEGORY_ACTION_ADD ? (
                    <>
                      <h4>Registrar categoría</h4>
                      <div className="category-inline-actions">
                        <input
                          type="text"
                          placeholder="Nombre de categoría"
                          value={newCategoryName}
                          onChange={(event) => setNewCategoryName(event.target.value)}
                        />
                        <AppButton
                          variant="solid"
                          type="button"
                          onClick={createCategory}
                          disabled={categorySaving}
                        >
                          Guardar categoría
                        </AppButton>
                      </div>
                    </>
                  ) : null}

                  {categoryAction === CATEGORY_ACTION_EDIT ? (
                    <>
                      <h4>Editar categoría</h4>
                      <div className="category-inline-actions">
                        <select
                          value={categoryTargetIdValue}
                          onChange={(event) => onCategoryTargetChange(event.target.value)}
                        >
                          <option value="">Selecciona una categoría</option>
                          {adminMeta.categorias.map((categoria) => (
                            <option
                              key={categoria.id_categoria}
                              value={categoria.id_categoria}
                            >
                              {categoria.nombre}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Nuevo nombre"
                          value={categoryEditName}
                          onChange={(event) => setCategoryEditName(event.target.value)}
                        />
                        <AppButton
                          variant="solid"
                          type="button"
                          onClick={updateCategory}
                          disabled={categorySaving}
                        >
                          Actualizar categoría
                        </AppButton>
                      </div>
                    </>
                  ) : null}

                  {categoryAction === CATEGORY_ACTION_DELETE ? (
                    <>
                      <h4>Eliminar categoría</h4>
                      <div className="category-inline-actions">
                        <select
                          value={categoryTargetIdValue}
                          onChange={(event) => onCategoryTargetChange(event.target.value)}
                        >
                          <option value="">Selecciona una categoría</option>
                          {adminMeta.categorias.map((categoria) => (
                            <option
                              key={categoria.id_categoria}
                              value={categoria.id_categoria}
                            >
                              {categoria.nombre}
                            </option>
                          ))}
                        </select>
                        <AppButton
                          variant="danger"
                          type="button"
                          onClick={removeCategory}
                          disabled={categorySaving}
                        >
                          Eliminar categoría
                        </AppButton>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            {editingProductId ? (
              <form
                ref={adminFormRef}
                className="admin-edit-layout"
                onSubmit={onAdminSubmit}
              >
              <div className="admin-edit-main">
                <section className="admin-edit-card">
                  <div className="admin-edit-card-header">
                    <h4>Información general</h4>
                    <p>Datos base del producto y su clasificación.</p>
                  </div>
                  <div className="admin-edit-grid">
                    <select
                      name="id_categoria"
                      value={adminForm.id_categoria}
                      onChange={onAdminChange}
                      required
                    >
                      <option value="">Categoría</option>
                      {adminMeta.categorias.map((categoria) => (
                        <option key={categoria.id_categoria} value={categoria.id_categoria}>
                          {categoria.nombre}
                        </option>
                      ))}
                    </select>

                    <select
                      name="id_proveedor"
                      value={adminForm.id_proveedor}
                      onChange={onAdminChange}
                      required
                    >
                      <option value="">Proveedor</option>
                      {adminMeta.proveedores.map((proveedor) => (
                        <option key={proveedor.id_proveedor} value={proveedor.id_proveedor}>
                          {proveedor.empresa}
                        </option>
                      ))}
                    </select>

                    <input
                      name="codigo"
                      placeholder="Código del producto"
                      value={adminForm.codigo}
                      onChange={onAdminChange}
                      required
                    />
                    <input
                      name="nombre"
                      placeholder="Nombre del producto"
                      value={adminForm.nombre}
                      onChange={onAdminChange}
                      required
                    />
                    <textarea
                      className="span-all"
                      name="descripcion"
                      placeholder="Descripción"
                      rows="3"
                      value={adminForm.descripcion}
                      onChange={onAdminChange}
                    />
                  </div>
                </section>

                <section className="admin-edit-card">
                  <div className="admin-edit-card-header">
                    <h4>Precios</h4>
                    <p>Define el costo y el valor de venta.</p>
                  </div>
                  <div className="admin-edit-grid">
                    <input
                      name="precio_compra"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Precio de compra"
                      value={adminForm.precio_compra}
                      onChange={onAdminChange}
                      required
                    />
                    <input
                      name="precio"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Precio de venta"
                      value={adminForm.precio}
                      onChange={onAdminChange}
                      required
                    />
                  </div>
                </section>

                <section className="admin-edit-card">
                  <div className="admin-edit-card-header">
                    <h4>Inventario y presentación</h4>
                    <p>Control de existencias y unidad comercial.</p>
                  </div>
                  <div className="admin-edit-grid">
                    <input
                      name="stock"
                      type="number"
                      min="0"
                      placeholder="Cantidad disponible"
                      value={adminForm.stock}
                      onChange={onAdminChange}
                      required
                    />
                    <input
                      name="stock_minimo"
                      type="number"
                      min="0"
                      placeholder="Stock mínimo"
                      value={adminForm.stock_minimo}
                      onChange={onAdminChange}
                      required
                    />
                    <select
                      name="unidad"
                      value={adminForm.unidad}
                      onChange={onAdminChange}
                      required
                    >
                      <option value="">Unidad de venta</option>
                      {PRODUCT_UNIT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </section>
              </div>

              <aside className="admin-edit-side">
                <section className="admin-edit-card admin-image-card">
                  <div className="admin-edit-card-header">
                    <h4>Foto del producto</h4>
                    <p>Selecciona una foto desde tu computadora para mostrar la primera imagen.</p>
                  </div>
                  <div className="image-preview-panel">
                    <AppImage src={previewImageUrl} alt="Vista previa del producto" />
                  </div>
                  <div className="admin-image-actions">
                    <AppButton
                      variant="ghost"
                      type="button"
                      onClick={openAdminImagePicker}
                      disabled={adminImageUploading}
                    >
                      {adminImageUploading ? 'Cargando...' : 'Agregar foto'}
                    </AppButton>
                    <AppButton
                      variant="danger"
                      type="button"
                      onClick={clearProductImage}
                      disabled={!adminForm.imagen_url.trim()}
                    >
                      Eliminar
                    </AppButton>
                  </div>
                  <input
                    ref={adminImageFileInputRef}
                    type="file"
                    accept="image/*"
                    className="admin-file-input"
                    onChange={onAdminImageFileChange}
                  />
                  <p className="admin-image-hint">
                    {adminForm.imagen_url
                      ? 'Foto cargada en el sistema.'
                      : 'Todavía no has seleccionado una foto.'}
                  </p>
                </section>

                <section className="admin-edit-card admin-state-card">
                  <div className="admin-edit-card-header">
                    <h4>Estado</h4>
                    <p>Activa o desactiva el producto en el catálogo.</p>
                  </div>
                  <select name="estado" value={adminForm.estado} onChange={onAdminChange}>
                    <option value="ACTIVO">Producto disponible</option>
                    <option value="INACTIVO">Producto no disponible</option>
                  </select>
                </section>
              </aside>

              {adminMessage ? (
                <p className="span-all status-text admin-status">{adminMessage}</p>
              ) : null}

              <div className="span-all admin-edit-actions">
                <AppButton variant="solid" type="submit" disabled={adminSaving}>
                  {adminSaving
                    ? 'Guardando...'
                    : 'Guardar cambios'}
                </AppButton>
                <AppButton variant="ghost" type="button" onClick={resetAdminForm}>
                  Cancelar edición
                </AppButton>
              </div>
              </form>
            ) : (
              <div className="admin-create-cta card">
                <h4>Crear un nuevo producto</h4>
                <p>
                  Para agregar un producto nuevo, usa la página separada de administración.
                  Así el catálogo queda más ordenado.
                </p>
                <Link className="btn btn-solid" to="/admin/productos/nuevo">
                  Ir a agregar producto
                </Link>
              </div>
            )}
          </section>
        </>
      ) : null}

      {visibleProductsByAdminCategory.length === 0 ? (
        <p className="status-text">No hay productos disponibles en esta sección.</p>
      ) : null}

      <div className="product-grid">
        {visibleProductsByAdminCategory.map((product, index) => {
          const stockActual = Number(product.stock) || 0
          const cantidadEnCarrito =
            cartQuantityByProductId.get(product.id_producto) || 0
          const stockRestante = Math.max(stockActual - cantidadEnCarrito, 0)
          const esLimitada = getCatalogGroup(product) === 'LIMITADA'
          const esCafe = ['ARTESANAL', 'LIMITADA'].includes(getCatalogGroup(product))
          const productImageUrl = getProductImageUrl(product, index)
          const productReviewSummary = reviewSummaryByProductId.get(Number(product.id_producto)) || {
            count: 0,
            average: 0,
          }
          const productReviews = productReviewsById.get(Number(product.id_producto)) || []
          const currentDraft = reviewDrafts[product.id_producto] || {
            rating: '5',
            comment: '',
          }

          return (
          <article
            key={product.id_producto}
            className={`card product-card ${
              featuredCodeNormalized &&
              normalizeCode(product.codigo) === featuredCodeNormalized
                ? 'product-card-featured'
                : ''
            }`}
          >
            <AppButton
              type="button"
              className="image-zoom-btn"
              onClick={() =>
                onPreviewImage({
                  src: productImageUrl,
                  alt: product.nombre,
                })
              }
              aria-label={`Ver imagen de ${product.nombre}`}
              unstyled
            >
              <AppImage
                src={productImageUrl}
                alt={product.nombre}
                className="product-image"
                loading="lazy"
              />
            </AppButton>
            {featuredCodeNormalized &&
            normalizeCode(product.codigo) === featuredCodeNormalized ? (
              <p className="limited-badge">Edición limitada</p>
            ) : null}
            <p className="category-tag">{product.categoria}</p>
            <h3>{product.nombre}</h3>
            <p>{getProductDescription(product)}</p>
            <div className="review-summary-block">
              <div className="review-summary-line">
                <ReviewStars rating={productReviewSummary.average} />
                <span>
                  {productReviewSummary.count > 0
                    ? `${productReviewSummary.average}/5 · ${productReviewSummary.count} reseñas`
                    : 'Sin reseñas aún'}
                </span>
              </div>
            </div>
            <p className={`stock-text ${stockActual === 0 ? 'stock-empty' : ''}`}>
              {esLimitada ? 'Edición limitada' : 'Disponibilidad'}: stock{' '}
              <strong>{stockActual}</strong>
            </p>
            <div className="product-review-panel">
              <RatingPicker
                label="Tu calificación"
                value={currentDraft.rating}
                onChange={(rating) =>
                  updateProductReviewDraft(product.id_producto, 'rating', rating)
                }
              />
              <AppButton
                variant="ghost"
                className="review-submit-btn"
                type="button"
                onClick={() =>
                  submitReview({
                    scope: REVIEW_SCOPE_PRODUCT,
                    idProducto: product.id_producto,
                    draft: currentDraft,
                    key: `product-${product.id_producto}`,
                  })
                }
                disabled={reviewSavingKey === `product-${product.id_producto}`}
              >
                {reviewSavingKey === `product-${product.id_producto}`
                  ? 'Guardando...'
                  : 'Enviar reseña'}
              </AppButton>
              <ReviewThreadList
                reviews={productReviews}
                emptyText="Aún no hay reseñas para este producto."
                isAuthenticated={Boolean(token)}
                isAdmin={isAdmin}
                currentUserId={user?.id_usuario}
                currentClientId={user?.id_cliente}
                currentUsername={user?.usuario}
                replyDrafts={reviewReplyDrafts}
                onReplyDraftChange={(reviewId, value) =>
                  setReviewReplyDrafts((prev) => ({ ...prev, [reviewId]: value }))
                }
                onSubmitReply={submitReviewReply}
                replyingKey={reviewReplySavingKey}
                conversationDrafts={conversationDrafts}
                onConversationDraftChange={(reviewId, value) =>
                  setConversationDrafts((prev) => ({ ...prev, [reviewId]: value }))
                }
                onSubmitConversationReply={submitConversationReply}
                conversationSavingKey={conversationSavingKey}
                onDeleteConversationReply={deleteConversationReply}
                conversationDeletingKey={conversationDeletingKey}
                onDeleteReview={deleteReview}
                deletingKey={reviewDeleteSavingKey}
              />
            </div>
            <div className="product-foot">
              <strong>{currency(Number(product.precio))}</strong>
              <div className="product-actions">
                {!isAdmin ? (
                  <AppButton
                    variant="solid"
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    disabled={stockRestante === 0}
                  >
                    {stockRestante === 0 ? 'Sin stock' : 'Agregar'}
                  </AppButton>
                ) : null}
                {isAdmin && esCafe ? (
                  <>
                    <AppButton
                      variant="ghost"
                      type="button"
                      onClick={() => startEditing(product)}
                    >
                      Editar
                    </AppButton>
                    <AppButton
                      variant="danger"
                      type="button"
                      onClick={() => deleteProduct(product)}
                      disabled={adminDeletingId === product.id_producto}
                    >
                      {adminDeletingId === product.id_producto
                        ? 'Eliminando...'
                        : 'Eliminar'}
                    </AppButton>
                  </>
                ) : null}
              </div>
            </div>
          </article>
          )
        })}
      </div>

    </section>
  )
}
