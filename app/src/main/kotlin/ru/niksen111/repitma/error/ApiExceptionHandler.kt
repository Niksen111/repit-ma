package ru.niksen111.repitma.error

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.multipart.MaxUploadSizeExceededException
import org.springframework.web.server.ResponseStatusException
import ru.niksen111.repitma.users.exception.UsernameAlreadyExistsException
import ru.niksen111.repitma.users.exception.ValidationException

@RestControllerAdvice
class ApiExceptionHandler {

    @ExceptionHandler(ResponseStatusException::class)
    fun requestFailed(exception: ResponseStatusException): ResponseEntity<ApiError> =
        ResponseEntity.status(exception.statusCode).body(
            ApiError(
                code = ApiErrorCode.REQUEST_FAILED,
                message = exception.reason ?: "Запрос не может быть выполнен",
            ),
        )

    @ExceptionHandler(MaxUploadSizeExceededException::class)
    @ResponseStatus(HttpStatus.PAYLOAD_TOO_LARGE)
    fun uploadTooLarge() = ApiError(
        code = ApiErrorCode.FILE_TOO_LARGE,
        message = "Файл должен быть не больше 25 МБ",
    )

    @ExceptionHandler(ValidationException::class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    fun authValidationFailed(exception: ValidationException) =
        ApiError(code = ApiErrorCode.VALIDATION_FAILED, message = exception.message.orEmpty())

    @ExceptionHandler(UsernameAlreadyExistsException::class)
    @ResponseStatus(HttpStatus.CONFLICT)
    fun usernameAlreadyExists(exception: UsernameAlreadyExistsException) =
        ApiError(code = ApiErrorCode.USERNAME_EXISTS, message = exception.message.orEmpty())

    @ExceptionHandler(MethodArgumentNotValidException::class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    fun validationFailed(exception: MethodArgumentNotValidException): ApiError {
        val fields = exception.bindingResult.fieldErrors.associate { it.field to it.defaultMessage.orEmpty() }
        return ApiError(
            code = ApiErrorCode.VALIDATION_FAILED,
            message = "Проверьте введенные данные",
            fields = fields,
        )
    }
}
